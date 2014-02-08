import _ = require("underscore");
import Promise = require("bluebird");

import Logger = require("../../lib/logger");
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


export class Bookkeeper {
    constructor(private db: database.Database, private server: Flugelserver) { }

    public fetchTicker(exchange: Exchange, market: Market) {
        log.debug(market.describe() + " - fetching ticker");
        return exchange.fetchTicker(market.left, market.right).then(ticker => {
            log.debug(market.describe() + " - got ticker");
            this.streamTicker(market, ticker);
            this.db.insert_ticker(market.id, ticker).done();
        }, err => {
            log.error(market.describe() + " - error fetching ticker: " + err);
        });
    }

    public fetchTrades(exchange: Exchange, market: Market) {
        var numTrades: number;
        return this.db.get_most_recent_trade(market.id).then(mostRecentTrade => {
            var since = this.getTradesFetchStart(market, mostRecentTrade);
            log.debug(market.describe() + " - fetching trades since " + since.toISOString());
            return exchange.fetchTrades(market.left, market.right, since);
        }).then((trades: Trade[]) => {
            if (trades.length) {
                var diff = trades[trades.length - 1].timestamp.getTime() - new Date().getTime();
                if (diff > 0)
                    log.info(market.describe() + " - last received trade is " +
                        diff / 1000 + " sec in the future");
            }

            numTrades = trades.length;
            return this.filterTradesToUnseen(market, trades);
        }).then((trades: Trade[]): any => {
            var message = market.describe() + " - received " + numTrades + " trades, " +
                trades.length + " of which are new";
            if (trades.length)
                message += ", from " + trades[0].timestamp.toISOString() + " to " +
                    trades[trades.length - 1].timestamp.toISOString();
            log.debug(message);

            this.streamTrades(market, trades);
            _.each(trades, trade => {
                this.db.insert_trade(market.id, trade).done();
            });
        }, (err: any) => {
            log.error(market.describe() + " - error fetching trades: " + err);
        });
    }

    public fetchDepth(exchange: Exchange, market: Market) {
        log.debug(market.describe() + " - fetching depth");
        return exchange.fetchOrderBook(market.left, market.right).then(orderBook => {
            log.debug(market.describe() + " - got depth, " + orderBook.bids.length +
                " bids, " + orderBook.asks.length + " asks");
            this.streamOrderBook(market, orderBook);
            this.storeOrderBook(market, orderBook, new Date());
        }, err => {
            log.error(market.describe() + " - error fetching depth: " + err);
        });
    }

    private getTradesFetchStart(market: Market, mostRecentTrade: Trade) {
        var maxGap = 60 * 60 * 1000;
        if (mostRecentTrade) {
            if (Date.now() - mostRecentTrade.timestamp.getTime() > maxGap)
                log.attentionRequired(market.describe() +
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
