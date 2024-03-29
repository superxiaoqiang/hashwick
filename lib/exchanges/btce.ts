import https = require("https");

import _ = require("lodash");

import httpx = require("../httpx");
import Logger = require("../logger");
import Order = require("../models/order");
import OrderBook = require("../models/orderBook");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


var log = new Logger("lib.exchanges.btce");


class BTCE extends Exchange {
    public fetchTicker(left: string, right: string) {
        return httpx.request(https, {
            host: "btc-e.com",
            path: "/api/2/" + encodePair(left, right) + "/ticker",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return decodeTicker(data.ticker);
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        return httpx.request(https, {
            host: "btc-e.com",
            path: "/api/2/" + encodePair(left, right) + "/trades",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            data.reverse();  // order from oldest to newest
            return _.map(data, decodeTrade);
        });
    }

    public fetchOrderBook(left: string, right: string) {
        return httpx.request(https, {
            host: "btc-e.com",
            path: "/api/2/" + encodePair(left, right) + "/depth",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return new OrderBook(
                _.map(data.bids, decodeOrder),
                _.map(data.asks, decodeOrder));
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

function decodeOrder(o: any) {
    return new Order(o[0].toString(), o[1].toString());
}


export = BTCE;
