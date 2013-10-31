import _ = require("underscore");

import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import database = require("./database");
import markets = require("./markets");
import Flugelserver = require("./server");


// TODO: be resilient to errors (in the whole project)


class Collector {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private exchangeName: string,
                private db: database.Database, private server: Flugelserver) { }

    public streamTicker(left: string, right: string, ticker: Ticker) {
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (!(latest && latest.equivalent(ticker))) {
            this.latestTickers[market.id] = ticker;

            this.server.broadcast("ticker:" + market.id, {
                timestamp: ticker.timestamp.getTime() / 1000,
                last: ticker.last,
                bid: ticker.bid,
                ask: ticker.ask,
            });
        }
    }

    public storeTicker(left: string, right: string, ticker: Ticker) {
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return;

        this.db.insert_ticker(market.id, ticker);
    }

    public getMostRecentStoredTrade(left: string, right: string, callback: (err: any, trade?: Trade) => void) {
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return callback(new Error("market not found"));

        this.db.get_most_recent_trade(market.id, callback);
    }

    public streamTrades(left: string, right: string, trades: Trade[]) {
        if (!trades.length)
            return;
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
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

    public storeTrades(left: string, right: string, trades: Trade[]) {
        if (!trades.length)
            return;
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return;

        // yes, i am aware of how terrible making db calls in a loop is
        _.each(trades, trade => {
            var addIfNotExisting = (err: any, existingTrade: Trade) => {
                if (err)
                    throw err;
                if (!existingTrade)
                    this.db.insert_trade(market.id, trade);
            };

            if (trade.id_from_exchange)
                this.db.get_trade_by_id_from_exchange(market.id, trade.id_from_exchange, addIfNotExisting);
            else
                throw 0;  // TODO: instead search by timestamp/price/amount
        });
    }
}

export = Collector;
