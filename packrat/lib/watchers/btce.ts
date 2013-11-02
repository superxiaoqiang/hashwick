import https = require("https");

import _ = require("underscore");
import Promise = require("bluebird");

import httpx = require("../../../lib/httpx");
import Logger = require("../../../lib/logger");
import PromiseScheduler = require("../../../lib/promiseScheduler");
import Ticker = require("../../../lib/models/ticker");
import Trade = require("../../../lib/models/trade");
import Collector = require("../collector");
import Watcher = require("./watcher");


var log = new Logger("packrat.lib.watchers.btce");


class BTCEWatcher extends Watcher {
    public exchangeName = "btce";

    private collector: Collector;
    private scheduler: PromiseScheduler;

    public start(collector: Collector) {
        log.info("starting");
        this.collector = collector;
        this.scheduler = new PromiseScheduler(5 * 1000);
        this.scheduler.schedule(this.ticker.bind(this, "BTC", "USD"), 10 * 1000);
        this.scheduler.schedule(this.trades.bind(this, "BTC", "USD"), 10 * 1000);
    }

    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    private ticker(left: string, right: string) {
        return new Promise(resolve => {
            var request = https.request({
                host: "btc-e.com",
                path: "/api/2/" + encodePair(left, right) + "/ticker",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching ticker", resolve));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                var ticker = decodeTicker(data.ticker);
                this.collector.streamTicker(left, right, ticker);
                this.collector.storeTicker(left, right, ticker);
                resolve();
            }));
        });
    }

    private trades(left: string, right: string) {
        return new Promise(resolve => {
            var request = https.request({
                host: "btc-e.com",
                path: "/api/2/" + encodePair(left, right) + "/trades",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching trades", resolve));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                data.reverse();  // order from oldest to newest
                var trades = _.map(data, decodeTrade);
                this.collector.streamTrades(left, right, trades);
                this.collector.storeTrades(left, right, trades);
                resolve();
            }));
        });
    }
}


function encodePair(left: string, right: string) {
    return left.toLowerCase() + "_" + right.toLowerCase();
}

function decodeTicker(t: any) {
    return new Ticker(new Date(t.updated * 1000), t.last, t.sell, t.buy);
}

function decodeTrade(t: any) {
    var flags = 0;
    if (t.trade_type === "bid")
        flags |= Trade.BUY;
    else if (t.trade_type === "ask")
        flags |= Trade.SELL;
    else
        log.warning("unknown trade_type " + t.trade_type)

    return new Trade(new Date(t.date * 1000), flags, t.price, t.amount, t.tid.toString());
}


export = BTCEWatcher;
