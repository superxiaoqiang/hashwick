import https = require("https");

import _ = require("lodash");

import httpx = require("../httpx");
import Order = require("../models/order");
import OrderBook = require("../models/orderBook");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


// TODO: figure out SSL cert issue and remove rejectUnauthorized


class Bitfinex extends Exchange {
    public fetchTicker(left: string, right: string) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/ticker/" + encodePair(left, right),
            headers: this.requestHeaders(),
            rejectUnauthorized: false,
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
            rejectUnauthorized: false,
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            data.reverse();  // order from oldest to newest
            return _.filter(_.map(data, decodeTrade), t => <any>t);
        });
    }

    public fetchOrderBook(left: string, right: string) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/book/" + encodePair(left, right),
            headers: this.requestHeaders(),
            rejectUnauthorized: false,
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return new OrderBook(
                _.map(data.bids, decodeOrder),
                _.map(data.asks, decodeOrder));
        });
    }

    public fetchLends(asset: string, since: Date) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/lends/" + encodeAsset(asset),
            headers: this.requestHeaders({
                timestamp: Math.floor(since.getTime() / 1000).toString(),
            }),
            rejectUnauthorized: false,
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            data.reverse();  // order from oldest to newest
            return _.map(data, decodeLend);
        });
    }

    public fetchLendBook(asset: string) {
        return httpx.request(https, {
            host: "api.bitfinex.com",
            path: "/v1/lendbook/" + encodeAsset(asset),
            headers: this.requestHeaders(),
            rejectUnauthorized: false,
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return new OrderBook(
                _.map(data.bids, decodeLendOffer),
                _.map(data.asks, decodeLendOffer));
        });
    }

    private requestHeaders(payload?: any) {
        return payload && {
            "X-BFX-PAYLOAD": new Buffer(JSON.stringify(payload)).toString("base64")
        };
    }
}


function encodeAsset(asset: string) {
    return asset.toLowerCase();
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
    if (t.exchange !== "bitfinex")
        return null;
    return new Trade(decodeTimestamp(t.timestamp), 0, t.price, t.amount);
}

function decodeOrder(o: any) {
    return new Order(o.price, o.amount);
}

function decodeLend(t: any) {
    return new Trade(decodeTimestamp(t.timestamp), 0, "" + t.rate / 365, t.amount_lent);
}

function decodeLendOffer(o: any) {
    return new Order("" + o.rate / 365, o.amount);
}


export = Bitfinex;
