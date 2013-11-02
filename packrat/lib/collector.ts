import _ = require("underscore");
import Promise = require("bluebird");

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

        this.db.insert_ticker(market.id, ticker).done();
    }

    public getMostRecentStoredTrade(left: string, right: string) {
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return Promise.rejected(new Error("market not found"));

        return this.db.get_most_recent_trade(market.id);
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

    private findMatchingTrade(market: markets.Market, trade: Trade) {
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

    public storeTrades(left: string, right: string, trades: Trade[]) {
        if (!trades.length)
            return;
        var market = markets.get(this.exchangeName, left, right);
        if (!market)
            return;

        // yes, i am aware of how terrible making db calls in a loop like this is
        _.each(trades, trade => {
            this.findMatchingTrade(market, trade).then(matchingTrade => {
                if (!matchingTrade)
                    this.db.insert_trade(market.id, trade).done();
            }).done();
        });
    }
}

export = Collector;
