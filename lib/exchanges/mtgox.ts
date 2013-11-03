import https = require("https");

import _ = require("underscore");

import httpx = require("../httpx");
import Logger = require("../logger");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");
import Exchange = require("./exchange");


var log = new Logger("lib.exchanges.mtgox");


class MtGox extends Exchange {
    public fetchTicker(left: string, right: string) {
        return httpx.request(https, {
            host: "data.mtgox.com",
            path: "/api/2/" + encodePair(left, right) + "/money/ticker",
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return decodeTicker(data.data).ticker;
        });
    }

    public fetchTrades(left: string, right: string, since: Date) {
        return httpx.request(https, {
            host: "data.mtgox.com",
            path: "/api/2/" + encodePair(left, right) + "/money/trades/fetch?since=" +
                Math.floor(since.getTime() * 1000),
        }).then(httpx.readBody).then(body => {
            var data = JSON.parse(body);
            return _.map(data.data, (t: any) => decodeTrade(t).trade);
        });
    }
}


function encodePair(left: string, right: string) {
    return left + right;
}

function decodeTimestamp(timestamp: string) {
    return new Date(parseInt(timestamp) / 1000);
}

var currencies = {
    BTC: 8,
    USD: 5,
}

function decodeMoneyInt(value: string, currency: string) {
    var places = currencies[currency];
    // TODO: choose and use a big decimal library
    var horrific = "0000000000000" + value;
    var cringeworthy = horrific.slice(0, -places) + "." + horrific.slice(-places);
    return /((?:[1-9]|0\.).+)/.exec(cringeworthy)[1];
}

function decodeTicker(t: any) {
    return {
        left: t.item,
        right: t.low.currency,
        ticker: new Ticker(decodeTimestamp(t.now), t.last.value, t.buy.value, t.sell.value),
    };
}

function decodeTrade(t: any) {
    var left = t.item;
    var right = t.price_currency;
    var price = decodeMoneyInt(t.price_int, right);
    var amount = decodeMoneyInt(t.amount_int, left);
    var flags = 0;

    if (t.trade_type === "bid")
        flags |= Trade.BUY;
    else if (t.trade_type === "ask")
        flags |= Trade.SELL;
    else
        log.warning("trade_type = '" + t.trade_type + "'?");

    var properties = t.properties.split(",");
    if (_.contains(properties, "limit"))
        flags |= Trade.LIMIT;
    if (_.contains(properties, "market"))
        flags |= Trade.MARKET;

    return {
        left: left,
        right: right,
        trade: new Trade(decodeTimestamp(t.tid), flags, price, amount, t.tid),
    };
}


export = MtGox;
