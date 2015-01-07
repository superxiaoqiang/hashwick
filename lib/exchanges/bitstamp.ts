import https = require("https");

import _ = require("lodash");
import Promise = require("bluebird");

import httpx = require("../httpx");
import Order = require("../models/order");
import OrderBook = require("../models/orderBook");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


class Bitstamp extends Exchange {
    public fetchTicker(left: string, right: string) {
        if (left !== "BTC" || right !== "USD")
            return Promise.rejected(new Error("invalid asset pair"));

        return httpx.request(https, {
            host: "www.bitstamp.net",
            path: "/api/ticker/",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return decodeTicker(data);
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        if (left !== "BTC" || right !== "USD")
            return Promise.rejected(new Error("invalid asset pair"));

        return httpx.request(https, {
            host: "www.bitstamp.net",
            path: "/api/transactions/?timedelta=" +
                Math.ceil((Date.now() - since.getTime()) / 1000),
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return _.map(data, decodeTrade);
        });
    }

    public fetchOrderBook(left: string, right: string) {
        if (left !== "BTC" || right !== "USD")
            return Promise.rejected(new Error("invalid asset pair"));

        return httpx.request(https, {
            host: "www.bitstamp.net",
            path: "/api/order_book/",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return new OrderBook(
                _.map(data.bids, decodeOrder),
                _.map(data.asks, decodeOrder));
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

function decodeOrder(o: any) {
    return new Order(o[0], o[1]);
}


export = Bitstamp;
