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


var log = new Logger("packrat.lib.watchers.bitfinex");


class BitfinexWatcher extends Watcher {
    public exchangeName = "bitfinex";

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

    private requestHeaders(payload: any) {
        return payload && {
            "X-BFX-PAYLOAD": new Buffer(JSON.stringify(payload)).toString("base64")
        };
    }

    private ticker(left: string, right: string) {
        return new Promise(resolve => {
            var request = https.request({
                host: "api.bitfinex.com",
                path: "/v1/ticker/" + encodePair(left, right),
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
            this.collector.getMostRecentStoredTrade(left, right).then(mostRecentTrade => {
                var payload: any;
                if (mostRecentTrade) {
                    var lastTime = mostRecentTrade.timestamp;
                    if (Date.now() - lastTime.getTime() > 60 * 60 * 1000)
                        log.attentionRequired("collector has been down since " + lastTime);
                    else
                        payload = {timestamp: Math.floor(lastTime.getTime() / 1000).toString()};
                }
                var request = https.request({
                    host: "api.bitfinex.com",
                    path: "/v1/trades/" + encodePair(left, right),
                    headers: this.requestHeaders(payload),
                });
                request.end();

                request.on("error", this.errorHandler("error fetching trades", resolve));

                request.on("response", httpx.bodyAmalgamator(str => {
                    var data = JSON.parse(str);
                    data.reverse();  // order from earliest to latest
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


function encodePair(left: string, right: string) {
    return left.toLowerCase() + right.toLowerCase();
}

function decodeTicker(t: any) {
    return new Ticker(new Date(t.timestamp * 1000), t.last_price, t.bid, t.ask);
}

function decodeTrade(t: any) {
    return new Trade(new Date(t.timestamp * 1000), 0, t.price, t.amount);
}


export = BitfinexWatcher;
