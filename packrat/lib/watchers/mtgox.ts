import _ = require("underscore");
import WebSocket = require("ws");

import clingyWebSocket = require("../../../lib/clingyWebSocket");
import Logger = require("../../../lib/logger");
import Ticker = require("../../../lib/models/ticker");
import Trade = require("../../../lib/models/trade");
import config = require("../../config");
import Collector = require("../collector");
import Watcher = require("./watcher");


var log = new Logger("packrat.lib.watchers.mtgox");


class MtGoxWatcher extends Watcher {
    public exchangeName = "mtgox";

    private collector: Collector;
    private socket: clingyWebSocket.ClingyWebSocket;
    private handlers: { [channel: string]: (data: any) => void; };

    constructor() {
        super();
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
