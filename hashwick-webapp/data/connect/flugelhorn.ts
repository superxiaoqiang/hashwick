import clingyWebSocket_ = require("../../../lib/clingyWebSocket");
if (0) clingyWebSocket_;
import ClingyWebSocket = clingyWebSocket_.ClingyWebSocket;
import ClingyWebSocketOptions = clingyWebSocket_.ClingyWebSocketOptions;
import mixin = require("../../../lib/mixin");
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
    public channels: { [name: string]: Channel; } = {};
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

    public getReadyState() {
        return this.socket ? this.socket.getReadyState() : WebSocket.CLOSED;
    }

    public register(name: string) {
        var channel = new Channel(name);
        this.channels[name] = channel;
        return channel;
    }

    public send(channelName: string, data: any) {
        this.socket.send(JSON.stringify({command: "message", channel: channelName, data: data}));
    }

    public subscribe(channel: Channel) {
        this.connect();
        this.log.debug("subscribing to " + channel.name);
        channel.subscribed = true;
        if (this.getReadyState() === WebSocket.OPEN)
            this.socket.send(JSON.stringify({command: "subscribe", channel: channel.name}));
    }

    public unsubscribe(channel: Channel) {
        this.log.debug("unsubscribing from " + channel.name);
        channel.subscribed = false;
        if (this.getReadyState() === WebSocket.OPEN)
            this.socket.send(JSON.stringify({command: "unsubscribe", channel: channel.name}));
    }

    private onConnect() {
        _.each(this.channels, channel => {
            if (channel.subscribed)
                this.socket.send(JSON.stringify({command: "subscribe", channel: channel.name}));
            if (channel.onOpen)
                channel.onOpen();
        });
    }

    private onMessage(event: MessageEvent) {
        var data = JSON.parse(event.data);
        statusIcon.logPacket(data.channel || "[unknown]");
        var channel = this.channels[data.channel];
        if (channel && channel.onMessage)
            channel.onMessage(data);
    }
}


class Channel {
    public subscribed: boolean;
    public onOpen: () => void;
    public onMessage: (data: any) => void;

    constructor(public name: string) { }

    public subscribe() {
        socketeer.subscribe(this);
    }

    public unsubscribe() {
        socketeer.unsubscribe(this);
    }
}


var socketeer = new Socketeer();


class RealtimeMixin {
    private log: Logger;
    private channel: Channel;
    private realtime: number;

    constructor() {
        this.realtime = 0;
    }

    public wantRealtime() {
        if (!this.realtime++)
            this.channel.subscribe();
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        if (!-- this.realtime)
            this.channel.unsubscribe();
        this.log.trace("realtime down to " + this.realtime);
    }
}


export class LiveTicker extends interfaces.LiveTickerDataSource implements RealtimeMixin {
    private marketID: string;
    private log: Logger;
    private data: SnapshotData<Ticker>;
    private channel: Channel;
    private pendingPrefetch: boolean;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        mixin.apply(this, new RealtimeMixin());
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.LiveTicker:" + marketID);
        this.channel = socketeer.register("ticker:" + this.marketID);
        this.channel.onOpen = this.open.bind(this);
        this.channel.onMessage = this.message.bind(this);
    }

    public prefetch() {
        if (socketeer.getReadyState() === WebSocket.OPEN)
            socketeer.send("getTicker", {marketID: this.marketID});
        else
            this.pendingPrefetch = true;
        return this.pendingPromise.promise();
    }

    public getFromMemory() {
        return this.data;
    }

    private open() {
        if (this.pendingPrefetch) {
            this.prefetch();
            this.pendingPrefetch = false;
        }
    }

    private message(message: any) {
        var timestamp = new Date(message.data.timestamp * 1000);
        var ticker = decodeTicker(message.data);
        this.data = new SnapshotData(timestamp, ticker);
        this.gotData.emit();
        this.pendingPromise.resolve();
    }
}


// TODO: evaluate whether or not this is useful or necessary
export class RealtimeTrades extends interfaces.TradesDataSource {
    private marketID: string;
    private log: Logger;

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.RealtimeTrades:" + marketID);
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData([]);
    }
}


class CallerQueue<T> {
    private items: T[] = [];

    constructor(private runner: (obj: any) => void) { }

    public queue(obj: T) {
        this.items.push(obj);
    }

    public runOne() {
        var next = this.items.shift();
        if (next)
            this.runner(next);
    }
}


export class HistoricalTrades extends interfaces.TradesDataSource implements RealtimeMixin {
    private marketID: string;
    private log: Logger;
    private items: RangeCache<number, Trade>;
    private channel: Channel;
    private pendingPromise = new PendingPromise<void>();
    private prefetchQueue: CallerQueue<any>;

    constructor(marketID: string) {
        super();
        mixin.apply(this, new RealtimeMixin());

        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.HistoricalTrades:" + marketID);
        this.items = new RangeCache<number, Trade>(
            this.format.sortKey, this.format.uniqueKey, this.doRequest.bind(this));
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
        this.prefetchQueue = new CallerQueue<any>(this.runQueuedPrefetch.bind(this));

        this.channel = socketeer.register("trades:" + this.marketID);
        this.channel.onOpen = this.open.bind(this);
        this.channel.onMessage = this.message.bind(this);
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        this.prefetchQueue.queue([earliest, latest]);
        if (!this.pendingPromise.isPending() && socketeer.getReadyState() === WebSocket.OPEN)
            this.prefetchQueue.runOne();
        return this.pendingPromise.promise();
    }

    private runQueuedPrefetch(obj: any) {
        this.items.prefetch(obj[0].getTime(), obj[1].getTime());
    }

    private doRequest(earliest: number, latest: number) {
        this.log.trace("requsting " + new Date(earliest).toISOString() +
            " to " + new Date(latest).toISOString());
        socketeer.send("getTrades",
            {marketID: this.marketID, earliest: earliest / 1000, latest: latest / 1000});
        return this.pendingPromise.promise();
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest.getTime(), latest.getTime()));
    }

    private open() {
        this.prefetchQueue.runOne();
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


export class LiveDepth extends interfaces.LiveDepthDataSource implements RealtimeMixin {
    private marketID: string;
    private log: Logger;
    private data: SnapshotData<DepthData>;
    private channel: Channel;
    private pendingPrefetch: boolean;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        mixin.apply(this, new RealtimeMixin());
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.LiveDepth:" + marketID);
        this.channel = socketeer.register("depth:" + this.marketID);
        this.channel.onOpen = this.open.bind(this);
        this.channel.onMessage = this.message.bind(this);
    }

    public prefetch() {
        if (socketeer.getReadyState() === WebSocket.OPEN)
            socketeer.send("getDepth", {marketID: this.marketID});
        else
            this.pendingPrefetch = true;
        return this.pendingPromise.promise();
    }

    public getFromMemory() {
        return this.data;
    }

    private open() {
        if (this.pendingPrefetch) {
            this.prefetch();
            this.pendingPrefetch = false;
        }
    }

    private message(message: any) {
        var timestamp = new Date();
        var depth = decodeDepth(message.data);
        this.data = new SnapshotData(timestamp, depth);
        this.gotData.emit();
        this.pendingPromise.resolve();
    }
}


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

function decodeDepth(depth: any) {
    return {
        bids: _.map(depth.bids, decodeDepthItem),
        asks: _.map(depth.asks, decodeDepthItem),
    };
}

function decodeDepthItem(i: any) {
    return new DepthDataPoint(parseFloat(i.price), parseFloat(i.amount));
}
