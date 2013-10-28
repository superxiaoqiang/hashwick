import _ = require("underscore");

import date = require("../../lib/date");
import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import markets = require("./markets");
import Flugelserver = require("./server");
import Watcher = require("./watchers/watcher");


// TODO: be resilient to errors


class Collector {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private watcher: Watcher, private db: any, private server: Flugelserver) { }

    public start() {
        this.watcher.onTicker.attach(this.ticker.bind(this));
        this.watcher.onTrade.attach(this.trade.bind(this));
    }

    private ticker(ticker: Ticker) {
        var market = markets.get(this.watcher.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (latest && latest.equivalent(ticker))
            return;

        this.latestTickers[market.id] = ticker;

        this.server.broadcast("ticker:" + market.id, {
            timestamp: ticker.timestamp.getTime() / 1000,
            last: ticker.last,
            bid: ticker.bid,
            ask: ticker.ask,
        });

        this.db.query("INSERT INTO ticker" +
                " (market_id, timestamp, last, bid, ask) VALUES ($1, $2, $3, $4, $5)",
            [market.id, date.toFakeUTC(ticker.timestamp), ticker.last, ticker.bid, ticker.ask]);
    }

    private trade(trade: Trade) {
        var market = markets.get(this.watcher.exchangeName, trade.left, trade.right);
        if (!market)
            return;

        this.db.query("SELECT * FROM trade WHERE market_id = $1 AND id_from_exchange = $2",
                 [market.id, trade.id_from_exchange], (err: any, result: any) => {
            if (err)
                throw err;
            if (result.rows.length)
                return;

            this.server.broadcast("trade:" + market.id, {
                timestamp: trade.timestamp.getTime() / 1000,
                flags: trade.flags,
                price: trade.price,
                amount: trade.amount,
                id_from_exchange: trade.id_from_exchange,
            });

            this.db.query("INSERT INTO trade" +
                    " (market_id, timestamp, flags, price, amount, id_from_exchange)" +
                    " VALUES ($1, $2, $3, $4, $5, $6)",
                [market.id, date.toFakeUTC(trade.timestamp), trade.flags,
                    trade.price, trade.amount, trade.id_from_exchange]);
        });
    }
}

export = Collector;
