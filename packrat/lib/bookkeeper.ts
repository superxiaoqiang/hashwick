import _ = require("underscore");
import Promise = require("bluebird");

import Logger = require("../../lib/logger");
import PromiseScheduler = require("../../lib/promiseScheduler");
import Exchange = require("../../lib/exchanges/exchange");
import Market = require("../../lib/models/market");
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
            numTrades = trades.length;
            return this.filterTradesToUnseen(info.market, trades);
        }).then((trades: Trade[]): any => {
            log.debug(info.market.describe() + " - received " + numTrades + " trades, " +
                trades.length + " of which are new");
            this.streamTrades(info.market, trades);
            _.each(trades, trade => {
                this.db.insert_trade(info.market.id, trade).done();
            });
        }, (err: any) => {
            log.error(info.market.describe() + " - error fetching trades: " + err);
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

    private streamTicker(market: Market, ticker: Ticker) {
        this.server.broadcast("ticker:" + market.id, {
            timestamp: ticker.timestamp.getTime() / 1000,
            last: ticker.last,
            bid: ticker.bid,
            ask: ticker.ask,
        });
    }

    public streamTrades(market: Market, trades: Trade[]) {
        if (!trades.length)
            return;
        var ts = _.map(trades, trade => {
            return {
                timestamp: trade.timestamp.getTime() / 1000,
                flags: trade.flags,
                price: trade.price,
                amount: trade.amount,
                id_from_exchange: trade.id_from_exchange,
            };
        });
        this.server.broadcast("trades:" + market.id, {trades: ts});
    }
}
