import https = require("https");

import _ = require("underscore");
import Promise = require("bluebird");

import httpx = require("../httpx");
import Logger = require("../logger");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


var log = new Logger("lib.exchanges.bitstamp");


class Bitstamp extends Exchange {
    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    public fetchTicker(left: string, right: string) {
        return new Promise((resolve, reject) => {
            if (left !== "BTC" || right !== "USD")
                return reject(new Error("invalid asset pair"));

            var request = https.request({
                host: "www.bitstamp.net",
                path: "/api/ticker/",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching ticker", reject));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                resolve(decodeTicker(data));
            }));
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        return new Promise((resolve, reject) => {
            if (left !== "BTC" || right !== "USD")
                return reject(new Error("invalid asset pair"));

            var request = https.request({
                host: "www.bitstamp.net",
                path: "/api/transactions/?timedelta=" +
                    Math.ceil((Date.now() - since.getTime()) / 1000),
            });
            request.end();

            request.on("error", this.errorHandler("error fetching trades", reject));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                var trades = _.map(data, decodeTrade);
                resolve(trades);
            }));
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


export = Bitstamp;
