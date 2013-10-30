import https = require("https");

import _ = require("underscore");

import CallbackScheduler = require("../../../lib/callbackScheduler");
import httpx = require("../../../lib/httpx");
import Logger = require("../../../lib/logger");
import Ticker = require("../../../lib/models/ticker");
import Trade = require("../../../lib/models/trade");
import Collector = require("../collector");
import Watcher = require("./watcher");


var log = new Logger("packrat.lib.watchers.btce");


class BTCEWatcher extends Watcher {
    public exchangeName = "btce";

    private collector: Collector;
    private scheduler: CallbackScheduler;

    public start(collector: Collector) {
        log.info("starting");
        this.collector = collector;
        this.scheduler = new CallbackScheduler(5 * 1000);
        this.scheduler.schedule(this.ticker.bind(this, "BTC", "USD"), 10 * 1000);
    }

    private ticker(left: string, right: string, callback: () => void) {
        var request = https.request({
            host: "btc-e.com",
            path: "/api/2/" + encodePair(left, right) + "/ticker",
        });
        request.end();

        request.on("error", () => {
            log.error("error fetching ticker");
            callback();
        });

        request.on("response", httpx.bodyAmalgamator(str => {
            var data = JSON.parse(str);
            var ticker = decodeTicker(data.ticker);
            this.collector.streamTicker(left, right, ticker);
            this.collector.storeTicker(left, right, ticker);
            callback();
        }));
    }
}


function encodePair(left: string, right: string) {
    return left.toLowerCase() + "_" + right.toLowerCase();
}

function decodeTicker(t: any) {
    return new Ticker(new Date(t.updated * 1000), t.last, t.sell, t.buy);
}


export = BTCEWatcher;
