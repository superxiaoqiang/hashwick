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


var log = new Logger("packrat.lib.watchers.bitstamp");


class BitstampWatcher extends Watcher {
    public exchangeName = "bitstamp";

    private poller: Poller;

    constructor() {
        super();
        this.poller = new Poller(this);
    }

    public start(collector: Collector) {
        log.info("starting");
        this.poller.start(collector);
    }
}


class Poller {
    private collector: Collector;
    private scheduler: PromiseScheduler;

    constructor(private watcher: BitstampWatcher) { }

    public start(collector: Collector) {
        this.collector = collector;
        this.scheduler = new PromiseScheduler(5 * 1000);
        this.scheduler.schedule(this.ticker.bind(this, "BTC", "USD"), 10 * 1000);
        this.scheduler.schedule(this.trades.bind(this, "BTC", "USD"), 30 * 1000);
    }

    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    private ticker(left: string, right: string) {
        return new Promise(resolve => {
            if (left !== "BTC" || right !== "USD")
                return Promise.rejected(new Error("invalid asset pair"));

            var request = https.request({
                host: "www.bitstamp.net",
                path: "/api/ticker/",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching ticker", resolve));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                var ticker = decodeTicker(data);
                this.collector.streamTicker(left, right, ticker);
                this.collector.storeTicker(left, right, ticker);
                resolve();
            }));
        });
    }

    private trades(left: string, right: string) {
        return new Promise(resolve => {
            if (left !== "BTC" || right !== "USD")
                return Promise.rejected(new Error("invalid asset pair"));

            this.collector.getMostRecentStoredTrade(left, right).then(mostRecentTrade => {
                var path = "/api/transactions/";
                if (mostRecentTrade) {
                    var diff = Date.now() - mostRecentTrade.timestamp.getTime();
                    if (diff > 60 * 60 * 1000)
                        log.attentionRequired("collector has been down since " + mostRecentTrade.timestamp);
                    else
                        path += "?timedelta=" + Math.ceil(diff / 1000);
                }
                var request = https.request({host: "www.bitstamp.net", path: path});
                request.end();

                request.on("error", this.errorHandler("error fetching trades", resolve));

                request.on("response", httpx.bodyAmalgamator(str => {
                    var data = JSON.parse(str);
                    var trades = _.map(data, decodeTrade);
                    this.collector.streamTrades(left, right, trades);
                    this.collector.storeTrades(left, right, trades);
                    resolve();
                }));
            }, () => {
                this.errorHandler("error synchronizing with most recent locally-stored trade", resolve)();
            }).done();
        });
    }
}


function decodeTimestamp(timestamp: string) {
    return new Date(parseInt(timestamp) * 1000);
}

function decodeTicker(t: any) {
    return new Ticker(decodeTimestamp(t.timestamp), t.last, t.bid, t.ask);
}

function decodeTrade(t: any) {
    return new Trade(decodeTimestamp(t.date), 0, t.price, t.amount, t.tid);
}


export = BitstampWatcher;
