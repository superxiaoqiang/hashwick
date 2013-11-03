import https = require("https");

import _ = require("underscore");
import Promise = require("bluebird");

import httpx = require("../httpx");
import Logger = require("../logger");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


var log = new Logger("lib.exchanges.bitfinex");


class Bitfinex extends Exchange {
   public fetchTicker(left: string, right: string) {
        return new Promise((resolve, reject) => {
            var request = https.request({
                host: "api.bitfinex.com",
                path: "/v1/ticker/" + encodePair(left, right),
                headers: this.requestHeaders(),
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
            var payload = {timestamp: Math.floor(since.getTime() / 1000).toString()};
            var request = https.request({
                host: "api.bitfinex.com",
                path: "/v1/trades/" + encodePair(left, right),
                headers: this.requestHeaders(payload),
            });
            request.end();

            request.on("error", this.errorHandler("error fetching trades", reject));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                data.reverse();  // order from earliest to latest
                var trades = _.map(data, decodeTrade);
                resolve(trades);
            }));
        });
    }

    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    private requestHeaders(payload?: any) {
        return payload && {
            "X-BFX-PAYLOAD": new Buffer(JSON.stringify(payload)).toString("base64")
        };
    }
}


function encodePair(left: string, right: string) {
    return left.toLowerCase() + right.toLowerCase();
}

function decodeTimestamp(timestamp: number) {
    return new Date(timestamp * 1000);
}

function decodeTicker(t: any) {
    return new Ticker(decodeTimestamp(t.timestamp), t.last_price, t.bid, t.ask);
}

function decodeTrade(t: any) {
    return new Trade(decodeTimestamp(t.timestamp), 0, t.price, t.amount);
}


export = Bitfinex;
