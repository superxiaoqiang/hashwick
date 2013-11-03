import https = require("https");

import _ = require("underscore");
import Promise = require("bluebird");

import httpx = require("../httpx");
import Logger = require("../logger");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


var log = new Logger("lib.exchanges.btce");


class BTCE extends Exchange {
    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    public fetchTicker(left: string, right: string) {
        return new Promise((resolve, reject) => {
            var request = https.request({
                host: "btc-e.com",
                path: "/api/2/" + encodePair(left, right) + "/ticker",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching ticker", reject));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                resolve(decodeTicker(data.ticker));
            }));
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        return new Promise((resolve, reject) => {
            var request = https.request({
                host: "btc-e.com",
                path: "/api/2/" + encodePair(left, right) + "/trades",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching trades", reject));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                data.reverse();  // order from oldest to newest
                var trades = _.map(data, decodeTrade);
                resolve(trades);
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


export = BTCE;
