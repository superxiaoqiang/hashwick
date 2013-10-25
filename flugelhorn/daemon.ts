/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("underscore");
import pg = require("pg");

import Logger = require("../lib/logger");
import Ticker = require("../lib/models/ticker");
import Trade = require("../lib/models/trade");
import config = require("./config");
import markets = require("./markets");
import Watcher = require("./watchers/watcher");
import MtGoxWatcher = require("./watchers/mtgox");


// TODO: be resilient to errors


var logger = new Logger("flugelhorn.daemon");
logger.info("starting");


class WatcherInfo {
    constructor(public exchangeName: string, public watcher: Watcher) { }
}

var watchers: WatcherInfo[] = [
    new WatcherInfo("mtgox", new MtGoxWatcher()),
];

var db = new pg.Client(config.database);
db.connect((err: any) => {
    if (err)
        throw err;

    _.each(watchers, info => {
        new WatcherActuator(info).start();
    });
    logger.info("started");
});


class WatcherActuator {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private info: WatcherInfo) { }

    public start() {
        this.info.watcher.onTicker = this.ticker.bind(this);
        this.info.watcher.onTrade = this.trade.bind(this);
        this.info.watcher.start();
    }

    private ticker(ticker: Ticker) {
        var market = markets.get(this.info.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (latest && latest.equivalent(ticker))
            return;

        this.latestTickers[market.id] = ticker;

        db.query("INSERT INTO ticker (market_id, timestamp, last, bid, ask) VALUES ($1, $2, $3, $4, $5)",
            [market.id, ticker.timestamp, ticker.last, ticker.bid, ticker.ask]);
    }

    private trade(trade: Trade) {
        var market = markets.get(this.info.exchangeName, trade.left, trade.right);
        if (!market)
            return;

        db.query("SELECT * FROM trade WHERE market_id = $1 AND id_from_exchange = $2",
                 [market.id, trade.id_from_exchange], (err: any, result: any) => {
            if (err)
                throw err;
            if (result.rows.length)
                return;
            db.query("INSERT INTO trade (market_id, timestamp, flags, price, amount, id_from_exchange)" +
                " VALUES ($1, $2, $3, $4, $5, $6)",
                [market.id, trade.timestamp, trade.flags, trade.price, trade.amount, trade.id_from_exchange]);
        });
    }
}
