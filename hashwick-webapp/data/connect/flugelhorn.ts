import clingyWebSocket_ = require("../../../lib/clingyWebSocket");
if (0) clingyWebSocket_;
import ClingyWebSocket = clingyWebSocket_.ClingyWebSocket;
import ClingyWebSocketOptions = clingyWebSocket_.ClingyWebSocketOptions;
import PendingPromise = require("../../../lib/pendingPromise");
import rangeCache_ = require("../../../lib/rangeCache");
if (0) rangeCache_;
import RangeCache = rangeCache_.RangeCache;
import config = require("../../config");
import logger_ = require("../../logger");
if (0) logger_;
import Logger = logger_.Logger;
import frame = require("../../ui/frame");
import statusIcon_ = require("../../ui/statusIcon");
if (0) statusIcon_;
import StatusIcon = statusIcon_.StatusIcon;
import time = require("../../utils/time");
import interfaces = require("../interfaces");
import models_ = require("../models");
if (0) models_;
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;
import DepthData = models_.DepthData;
import DepthDataPoint = models_.DepthDataPoint;
import Ticker = models_.Ticker;
import Trade = models_.Trade;


var statusIcon: StatusIcon;


class Socketeer {
    private socket: ClingyWebSocket;
    public handlers: { [channel: string]: (data: any) => void; } = {};
    private log: Logger;

    public connect() {
        if (this.socket)
            return;
        this.socket = new ClingyWebSocket({
            maker: () => new WebSocket(config.flugelhornSocket),
            log: this.log,
        });
        this.socket.onopen = this.onConnect.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.log = new Logger("data.connect.flugelhorn.socketeer");
        statusIcon = frame.addFooterIcon("Flugelhorn", "/static/icons/flugelhorn.ico");
    }

    private disconnect() {
        this.socket.close();
        this.socket = null;
        frame.removeFooterIcon(statusIcon);
    }

    public send(channel: string, data: any) {
        this.socket.send(JSON.stringify({command: "message", channel: channel, data: data}));
    }

    public subscribe(channel: string) {
        this.connect();
        this.log.debug("subscribing to " + channel);
        this.socket.send(JSON.stringify({command: "subscribe", channel: channel}));
    }

    public unsubscribe(channel: string) {
        this.log.debug("unsubscribing from " + channel);
        this.socket.send(JSON.stringify({command: "unsubscribe", channel: channel}));
    }

    private onConnect() {
        for (var channel in this.handlers) {
            this.socket.send(JSON.stringify({command: "subscribe", channel: channel}));
        }
    }

    private onMessage(event: MessageEvent) {
        var data = JSON.parse(event.data);
        statusIcon.logPacket(data.channel || "[unknown]");
        var handler = this.handlers[data.channel];
        if (handler)
            handler(data);
    }
}

var socketeer = new Socketeer();


function decodeTicker(t: any) {
    var ticker = new Ticker();
    ticker.last = parseFloat(t.last);
    ticker.bid = parseFloat(t.bid);
    ticker.ask = parseFloat(t.ask);
    return ticker;
}

function decodeTrade(trade: any) {
    return new Trade(new Date(trade.timestamp * 1000), trade.flags,
        parseFloat(trade.price), parseFloat(trade.amount), trade.id_from_exchange);
}


export class LiveTicker extends interfaces.LiveTickerDataSource {
    private marketID: string;
    private log: Logger;
    private realtime: number;
    private data: SnapshotData<Ticker>;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.LiveTicker:" + marketID);
        this.realtime = 0;
        socketeer.handlers["ticker:" + this.marketID] = this.message.bind(this);
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe("ticker:" + this.marketID);
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        if (!-- this.realtime)
            socketeer.unsubscribe("ticker:" + this.marketID);
        this.log.trace("realtime down to " + this.realtime);
    }

    public prefetch() {
        socketeer.send("getTicker", {marketID: this.marketID});
        return this.pendingPromise.promise();
    }

    public getFromMemory() {
        return this.data;
    }

    private message(message: any) {
        var timestamp = new Date(message.data.timestamp * 1000);
        var ticker = decodeTicker(message.data);
        this.data = new SnapshotData(timestamp, ticker);
        this.gotData.emit();
        this.pendingPromise.resolve();
    }
}


export class RealtimeTrades extends interfaces.TradesDataSource {
    private marketID: string;
    private log: Logger;
    private realtime: number;
    private items: RangeCache<Date, Trade>;

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.RealtimeTrades:" + marketID);
        this.realtime = 0;
        this.items = new RangeCache<Date, Trade>(
            this.format.sortKey, this.format.uniqueKey, () => $.Deferred().resolve());
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
        socketeer.handlers["trades:" + this.marketID] = this.message.bind(this);
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe("trades:" + this.marketID);
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        if (!-- this.realtime)
            socketeer.unsubscribe("trades:" + this.marketID);
        this.log.trace("realtime down to " + this.realtime);
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }

    private message(message: any) {
        var trades = _.map(message.data.trades, decodeTrade);
        this.items.mergeItems(trades);
    }
}


export class HistoricalTrades extends interfaces.TradesDataSource {
    private marketID: string;
    private log: Logger;
    private items: RangeCache<Date, Trade>;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.HistoricalTrades:" + marketID);
        this.items = new RangeCache<Date, Trade>(
            this.format.sortKey, this.format.uniqueKey, this.prefetch.bind(this));
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
        socketeer.handlers["trades:" + this.marketID] = this.message.bind(this);
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        socketeer.send("getTrades",
            {marketID: this.marketID, earliest: earliest.getTime() / 1000, latest: latest.getTime() / 1000});
        return this.pendingPromise.promise();
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }

    private message(message: any) {
        var trades = _.map(message.data.trades, decodeTrade);
        this.logTradesInfo(trades);
        this.items.mergeItems(trades);
        this.pendingPromise.resolve();
    }

    private logTradesInfo(trades: Trade[]) {
        var message = "got " + trades.length + " trades";
        if (trades.length)
            message += ", from " + trades[0].timestamp.toISOString() +
                " to " + trades[trades.length - 1].timestamp.toISOString();
        this.log.trace(message);

        if (trades.length) {
            var diff = trades[trades.length - 1].timestamp.getTime() - time.serverNow().getTime();
            if (diff > 0)
                this.log.info("last received trade is " + diff / 1000 + " sec in the future");
        }
    }
}


export class LiveDepth extends interfaces.LiveDepthDataSource {
    private marketID: string;
    private log: Logger;
    private realtime: number;
    private data: SnapshotData<DepthData>;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.LiveDepth:" + marketID);
        this.realtime = 0;
        socketeer.handlers["depth:" + this.marketID] = this.message.bind(this);
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe("depth:" + this.marketID);
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        if (!-- this.realtime)
            socketeer.unsubscribe("depth:" + this.marketID);
        this.log.trace("realtime down to " + this.realtime);
    }

    public prefetch() {
        socketeer.send("getDepth", {marketID: this.marketID});
        return this.pendingPromise.promise();
    }

    public getFromMemory() {
        return this.data;
    }

    private message(message: any) {
        var timestamp = new Date();
        var depth = decodeDepth(message.data);
        this.data = new SnapshotData(timestamp, depth);
        this.gotData.emit();
        this.pendingPromise.resolve();
    }
}

function decodeDepth(depth: any) {
    return {
        bids: _.map(depth.bids, decodeDepthItem),
        asks: _.map(depth.asks, decodeDepthItem),
    };
}

function decodeDepthItem(i: any) {
    return new DepthDataPoint(parseFloat(i.price), parseFloat(i.amount));
}
