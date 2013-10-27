import _ = require("underscore");

import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import markets = require("./markets");
import Watcher = require("./watchers/watcher");


// TODO: be resilient to errors


class Collector {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private watcher: Watcher, private db: any, private server: any) { }

    public start() {
        this.watcher.onTicker.attach(this.ticker.bind(this));
        this.watcher.onTrade.attach(this.trade.bind(this));
    }

    private broadcast(data: any) {
        _.each(this.server.clients, (client: any) => {
            client.send(JSON.stringify(data));
        });
    }

    private ticker(ticker: Ticker) {
        var market = markets.get(this.watcher.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (latest && latest.equivalent(ticker))
            return;

        this.latestTickers[market.id] = ticker;

        this.broadcast("ticker");

        this.db.query("INSERT INTO ticker (market_id, timestamp, last, bid, ask) VALUES ($1, $2, $3, $4, $5)",
            [market.id, ticker.timestamp, ticker.last, ticker.bid, ticker.ask]);
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

            this.broadcast("trade");

            this.db.query("INSERT INTO trade (market_id, timestamp, flags, price, amount, id_from_exchange)" +
                " VALUES ($1, $2, $3, $4, $5, $6)",
                [market.id, trade.timestamp, trade.flags, trade.price, trade.amount, trade.id_from_exchange]);
        });
    }
}

export = Collector;
