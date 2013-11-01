import https = require("https");

import _ = require("underscore");
import Promise = require("bluebird");
import WebSocket = require("ws");

import clingyWebSocket = require("../../../lib/clingyWebSocket");
import httpx = require("../../../lib/httpx");
import Logger = require("../../../lib/logger");
import PromiseScheduler = require("../../../lib/promiseScheduler");
import Ticker = require("../../../lib/models/ticker");
import Trade = require("../../../lib/models/trade");
import config = require("../../config");
import Collector = require("../collector");
import Watcher = require("./watcher");


var log = new Logger("packrat.lib.watchers.mtgox");


class MtGoxWatcher extends Watcher {
    public exchangeName = "mtgox";

    private socketeer: Socketeer;
    private poller: Poller;

    constructor() {
        super();
        this.socketeer = new Socketeer(this);
        this.poller = new Poller(this);
    }

    public start(collector: Collector) {
        this.socketeer.start(collector);
        this.poller.start(collector);
    }
}


class Socketeer {
    private collector: Collector;
    private socket: clingyWebSocket.ClingyWebSocket;
    private handlers: { [channel: string]: (data: any) => void; };

    constructor(private watcher: MtGoxWatcher) {
        this.handlers = {
            "d5f06780-30a8-4a48-a2f8-7ed181b4a13f": this.ticker,  // ticker.BTCUSD
            "dbf1dee9-4f2e-4a08-8cb7-748919a71b21": this.trade,  // trade.BTC
        };
    }

    public start(collector: Collector) {
        this.collector = collector;
        this.socket = new clingyWebSocket.ClingyWebSocket({
            maker: () => new WebSocket("wss://websocket.mtgox.com/mtgox", {origin: config.origin}),
            log: log,
            timeout: 10 * 1000,
        });
        this.socket.onopen = this.open.bind(this);
        this.socket.onmessage = this.message.bind(this);
    }

    private open() {
    }

    private message(event: MessageEvent) {
        var data = JSON.parse(event.data);
        var handler = this.handlers[data.channel];
        if (handler)
            handler.call(this, data);
    }

    private ticker(data: any) {
        var stuff = decodeTicker(data.ticker);
        this.collector.streamTicker(stuff.left, stuff.right, stuff.ticker);
        this.collector.storeTicker(stuff.left, stuff.right, stuff.ticker);
    }

    private trade(data: any) {
        var stuff = decodeTrade(data.trade);
        this.collector.streamTrades(stuff.left, stuff.right, [stuff.trade]);
        this.collector.storeTrades(stuff.left, stuff.right, [stuff.trade]);
    }
}


class Poller {
    private collector: Collector;
    private scheduler: PromiseScheduler;

    constructor(private watcher: MtGoxWatcher) { }

    public start(collector: Collector) {
        this.collector = collector;
        this.scheduler = new PromiseScheduler(5 * 1000);
        this.scheduler.schedule(this.ticker.bind(this, "BTC", "USD"), 30 * 1000);
        this.scheduler.schedule(this.trades.bind(this, "BTC", "USD"), 30 * 1000);
    }

    private errorHandler(message: string, callback: () => void) {
        return () => {
            log.error(message);
            callback();
        };
    }

    private ticker(left: string, right: string) {
        return new Promise(resolve => {
            var request = https.request({
                host: "data.mtgox.com",
                path: "/api/2/" + encodePair(left, right) + "/money/ticker",
            });
            request.end();

            request.on("error", this.errorHandler("error fetching ticker", resolve));

            request.on("response", httpx.bodyAmalgamator(str => {
                var data = JSON.parse(str);
                var stuff = decodeTicker(data.data);
                this.collector.streamTicker(left, right, stuff.ticker);
                this.collector.storeTicker(left, right, stuff.ticker);
                resolve();
            }));
        });
    }

    private trades(left: string, right: string) {
        return new Promise(resolve => {
            this.collector.getMostRecentStoredTrade(left, right).then(trade => {
                var path = "/api/2/" + encodePair(left, right) + "/money/trades/fetch";
                if (trade) {
                    if (Date.now() - trade.timestamp.getTime() > 60 * 60 * 1000)
                        log.attentionRequired("collector has been down since " + trade.timestamp);
                    else
                        path += "?since=" + Math.floor(trade.timestamp.getTime() / 1000);
                }
                var request = https.request({host: "data.mtgox.com", path: path});
                request.end();

                request.on("error", this.errorHandler("error fetching trades", resolve));

                request.on("response", httpx.bodyAmalgamator(str => {
                    var data = JSON.parse(str);
                    var trades = _.map(data.data, (t: any) => decodeTrade(t).trade);
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


export = MtGoxWatcher;
