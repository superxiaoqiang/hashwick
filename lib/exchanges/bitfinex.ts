import https = require("https");

import _ = require("underscore");

import httpx = require("../httpx");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


class Bitfinex extends Exchange {
    public fetchTicker(left: string, right: string) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/ticker/" + encodePair(left, right),
            headers: this.requestHeaders(),
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return decodeTicker(data);
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/trades/" + encodePair(left, right),
            headers: this.requestHeaders({
                timestamp: Math.floor(since.getTime() / 1000).toString(),
            }),
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            data.reverse();  // order from oldest to newest
            return _.map(data, decodeTrade);
        });
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
