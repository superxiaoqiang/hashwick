import _ = require("underscore");
import Promise = require("bluebird");

import Logger = require("../../lib/logger");
import PromiseScheduler = require("../../lib/promiseScheduler");
import serializers = require("../../lib/serializers");
import Exchange = require("../../lib/exchanges/exchange");
import Market = require("../../lib/models/market");
import Order = require("../../lib/models/order");
import OrderBook = require("../../lib/models/orderBook");
import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import database = require("./database");
import Flugelserver = require("./server");


var log = new Logger("packrat.lib.bookkeeper");


export interface ExchangeInfo {
    exchange: Exchange;
    market: Market;
    pollSchedulingGroup: string;
    pollSchedulingGroupMinDelay: number;
    tickerPollRate?: number;
    tradesPollRate?: number;
    depthPollRate?: number;
}


export class Bookkeeper {
    private infos: ExchangeInfo[] = [];
    private schedulers: PromiseScheduler[] = [];

    constructor(private db: database.Database, private server: Flugelserver) { }

    public add(info: ExchangeInfo) {
        this.infos.push(info);
        var scheduler = this.schedulers[info.pollSchedulingGroup];
        if (!scheduler) {
            scheduler = this.schedulers[info.pollSchedulingGroup] =
                new PromiseScheduler(info.pollSchedulingGroupMinDelay);
        }

        if (info.tickerPollRate)
            scheduler.schedule(this.fetchTicker.bind(this, info), info.tickerPollRate);
        if (info.tradesPollRate)
            scheduler.schedule(this.fetchTrades.bind(this, info), info.tradesPollRate);
        if (info.depthPollRate)
            scheduler.schedule(this.fetchDepth.bind(this, info), info.depthPollRate);
    }

    private fetchTicker(info: ExchangeInfo) {
        log.debug(info.market.describe() + " - fetching ticker");
        return info.exchange.fetchTicker(info.market.left, info.market.right).then(ticker => {
            log.debug(info.market.describe() + " - got ticker");
            this.streamTicker(info.market, ticker);
            this.db.insert_ticker(info.market.id, ticker).done();
        }, err => {
            log.error(info.market.describe() + " - error fetching ticker: " + err);
        });
    }

    private fetchTrades(info: ExchangeInfo) {
        var numTrades: number;
        return this.db.get_most_recent_trade(info.market.id).then(mostRecentTrade => {
            var since = this.getTradesFetchStart(info, mostRecentTrade);
            log.debug(info.market.describe() + " - fetching trades since " + since.toISOString());
            return info.exchange.fetchTrades(info.market.left, info.market.right, since);
        }).then((trades: Trade[]) => {
            if (trades.length) {
                var diff = trades[trades.length - 1].timestamp.getTime() - new Date().getTime();
                if (diff > 0)
                    log.info(info.market.describe() + " - last received trade is " +
                        diff / 1000 + " sec in the future");
            }

            numTrades = trades.length;
            return this.filterTradesToUnseen(info.market, trades);
        }).then((trades: Trade[]): any => {
            var message = info.market.describe() + " - received " + numTrades + " trades, " +
                trades.length + " of which are new";
            if (trades.length)
                message += ", from " + trades[0].timestamp.toISOString() + " to " +
                    trades[trades.length - 1].timestamp.toISOString();
            log.debug(message);

            this.streamTrades(info.market, trades);
            _.each(trades, trade => {
                this.db.insert_trade(info.market.id, trade).done();
            });
        }, (err: any) => {
            log.error(info.market.describe() + " - error fetching trades: " + err);
        });
    }

    private fetchDepth(info: ExchangeInfo) {
        log.debug(info.market.describe() + " - fetching depth");
        return info.exchange.fetchOrderBook(info.market.left, info.market.right).then(orderBook => {
            log.debug(info.market.describe() + " - got depth, " + orderBook.bids.length +
                " bids, " + orderBook.asks.length + " asks");
            this.streamOrderBook(info.market, orderBook);
            this.storeOrderBook(info.market, orderBook, new Date());
        }, err => {
            log.error(info.market.describe() + " - error fetching depth: " + err);
        });
    }

    private getTradesFetchStart(info: ExchangeInfo, mostRecentTrade: Trade) {
        var maxGap = 60 * 60 * 1000;
        if (mostRecentTrade) {
            if (Date.now() - mostRecentTrade.timestamp.getTime() > maxGap)
                log.attentionRequired(info.market.describe() +
                    " - no trades stored since " + mostRecentTrade.timestamp.toISOString() +
                    ", you may need to check what's up");
            else
                return mostRecentTrade.timestamp;
        }
        return new Date(Date.now() - maxGap);
    }

    private filterTradesToUnseen(market: Market, trades: Trade[]) {
        return Promise.map(trades, this.findStoredMatchingTrade.bind(this, market))
            .map((matchingTrade, index) => matchingTrade ? null : trades[index])
            .filter(trade => trade);
    }

    private findStoredMatchingTrade(market: Market, trade: Trade) {
        // the easy case
        if (trade.id_from_exchange)
            return this.db.get_trade_by_id_from_exchange(market.id, trade.id_from_exchange);

        // the hard case (thanks, bitfinex)
        return new Promise((resolve, reject) => {
            var match: Trade;
            this.db.stream_trades_from_to(market.id,
                trade.timestamp, new Date(trade.timestamp.getTime() + 1000),
                err => { reject(); },
                row => {
                    if (trade.timestamp.getTime() === row.timestamp.getTime() &&
                        parseFloat(trade.price) === parseFloat(row.price) &&
                        parseFloat(trade.amount) === parseFloat(row.amount))
                        match = row;
                },
                result => {
                    resolve(match);
                });
        });
    }

    private storeOrderBook(market: Market, orderBook: OrderBook, timestamp: Date) {
        _.each(orderBook.bids, storeOrder.bind(this, Order.BID));
        _.each(orderBook.asks, storeOrder.bind(this, Order.ASK));

        function storeOrder(flags: number, order: Order) {
            this.db.insert_order(market.id, order, timestamp, flags).done();
        }
    }

    private streamTicker(market: Market, ticker: Ticker) {
        this.server.broadcast("ticker:" + market.id, serializers.serializeTicker(ticker));
    }

    public streamTrades(market: Market, trades: Trade[]) {
        if (!trades.length)
            return;
        var ts = _.map(trades, serializers.serializeTrade);
        this.server.broadcast("trades:" + market.id, {trades: ts});
    }

    public streamOrderBook(market: Market, orderBook: OrderBook) {
        this.server.broadcast("depth:" + market.id, serializers.serializeOrderBook(orderBook));
    }
}
