import clingyWebSocket_ = require("../../../lib/clingyWebSocket");
if (0) clingyWebSocket_;
import ClingyWebSocket = clingyWebSocket_.ClingyWebSocket;
import ClingyWebSocketOptions = clingyWebSocket_.ClingyWebSocketOptions;
import mixin = require("../../../lib/mixin");
import PendingPromise = require("../../../lib/pendingPromise");
import rangeCache_ = require("../../../lib/rangeCache");
if (0) rangeCache_;
import RangeCache = rangeCache_.RangeCache;
import CandleResampler = require("../../../lib/calc/candleResampler");
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
import Candle = models_.Candle;
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


class SimpleCountingRealtimeMixin {
    private log: Logger;
    private realtime: number;

    constructor() {
        this.realtime = 0;
    }

    public wantRealtime() {
        ++this.realtime;
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        --this.realtime;
        this.log.trace("realtime down to " + this.realtime);
    }
}


class ChannelSubscriptionRealtimeMixin {
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
        if (!--this.realtime)
            this.channel.unsubscribe();
        this.log.trace("realtime down to " + this.realtime);
    }
}


export class LiveTicker extends interfaces.LiveTickerDataSource implements ChannelSubscriptionRealtimeMixin {
    private marketID: string;
    private log: Logger;
    private data: SnapshotData<Ticker>;
    private channel: Channel;
    private pendingPrefetch: boolean;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        mixin.apply(this, new ChannelSubscriptionRealtimeMixin());

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


export class RealtimeTrades extends interfaces.TradesDataSource implements ChannelSubscriptionRealtimeMixin {
    private marketID: string;
    private log: Logger;
    private items: RangeCache<number, Trade>;
    private channel: Channel;

    constructor(marketID: string) {
        super();
        mixin.apply(this, new ChannelSubscriptionRealtimeMixin());

        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.RealtimeTrades:" + marketID);
        this.items = new RangeCache<number, Trade>(
            this.format.sortKey, this.format.uniqueKey, () => Promise.fulfilled());
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));

        this.channel = socketeer.register("trades:" + this.marketID);
        this.channel.onMessage = this.message.bind(this);
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest.getTime(), latest.getTime()));
    }

    private message(message: any) {
        var trades = _.map(message.data.trades, decodeTrade);
        logTradesInfo(this.log, trades);
        this.items.mergeItems(trades);
    }
}


export class HistoricalTrades extends interfaces.TradesDataSource implements SimpleCountingRealtimeMixin {
    private realtime: number;
    private marketID: string;
    private log: Logger;
    private items: RangeCache<number, Trade>;
    private channel: Channel;
    private pendingPromise = new PendingPromise<void>();
    private prefetchQueue: any[] = [];

    constructor(marketID: string) {
        super();
        mixin.apply(this, new SimpleCountingRealtimeMixin());

        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.HistoricalTrades:" + marketID);
        this.items = new RangeCache<number, Trade>(
            this.format.sortKey, this.format.uniqueKey, this.doRequest.bind(this));
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));

        this.channel = socketeer.register("getTrades:" + this.marketID);
        this.channel.onOpen = this.open.bind(this);
        this.channel.onMessage = this.message.bind(this);
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        this.prefetchQueue.push([earliest, latest]);
        if (!this.pendingPromise.isPending() && socketeer.getReadyState() === WebSocket.OPEN)
            this.prefetchDequeue();
        return this.pendingPromise.promise();
    }

    private prefetchDequeue() {
        if (!this.prefetchQueue.length)
            return;
        var next = this.prefetchQueue.shift();
        if (next)
            this.items.prefetch(next[0].getTime(), next[1].getTime());
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
        if (this.realtime && (<any>this.items).items.length) {
            // TODO: get rid of casts
            var last = (<any>this.items).items[(<any>this.items).items.length - 1];
            var timestamp = this.format.extractTimestamp(last);
            this.log.info("regained connection, catching up on trades since " + timestamp);
            this.prefetch(timestamp, time.serverNow());
        }
        this.prefetchDequeue();
    }

    private message(message: any) {
        var trades = _.map(message.data.trades, decodeTrade);
        logTradesInfo(this.log, trades);
        this.items.mergeItems(trades);
        this.pendingPromise.resolve();
        this.prefetchDequeue();
    }
}


export class Candles extends interfaces.OHLCVDataSource {
    private marketID: string;
    private log: Logger;
    private items: { [period: number]: RangeCache<number, Candle>; };
    private channel: Channel;
    private pendingPromise = new PendingPromise<void>();
    private prefetchQueue: any[] = [];

    constructor(marketID: string) {
        super();
        mixin.apply(this, new SimpleCountingRealtimeMixin());

        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.Candles:" + marketID);

        this.items = _.object(_.map([60], period => {
            var container = new RangeCache<number, Candle>(
                this.format.sortKey, this.format.uniqueKey, this.doRequest.bind(this, period));
            container.gotData.attach(this.gotData.emit.bind(this.gotData));
            return [period, container];
        }));

        this.channel = socketeer.register("getCandles:" + this.marketID);
        this.channel.onOpen = this.open.bind(this);
        this.channel.onMessage = this.message.bind(this);
    }

    public prefetch(earliest: Date, latest: Date, period: number) {
        var sourcePeriod = 60;
        this.log.trace("prefetch " + sourcePeriod + "-second candles from " +
            earliest.toISOString() + " to " + latest.toISOString());
        this.prefetchQueue.push([sourcePeriod, earliest, latest]);

        if (!this.pendingPromise.isPending() && socketeer.getReadyState() === WebSocket.OPEN)
            this.prefetchDequeue();
        return this.pendingPromise.promise();
    }

    private prefetchDequeue() {
        if (!this.prefetchQueue.length)
            return;
        var next = this.prefetchQueue.shift();
        if (next)
            this.items[next[0]].prefetch(next[1].getTime(), next[2].getTime());
    }

    private doRequest(period: number, earliest: number, latest: number) {
        this.log.trace("requsting " + period + "-second candles from " +
            new Date(earliest).toISOString() + " to " + new Date(latest).toISOString());
        socketeer.send("getCandles", {
            marketID: this.marketID,
            period: period,
            earliest: earliest / 1000,
            latest: latest / 1000,
        });
        return this.pendingPromise.promise();
    }

    public getFromMemory(earliest: Date, latest: Date, period: number): TemporalData<Candle> {
        var raw = this.items[60].getFromMemory(earliest.getTime(), latest.getTime());

        if (raw.length && raw[0].timespan !== period) {
            var candles: Candle[] = [];
            var resamp = new CandleResampler(period, candles.push.bind(candles));
            _.each(raw, resamp.feedCandle.bind(resamp));
        } else {
            candles = raw;
        }

        return new TemporalData(candles);
    }

    private open() {
        this.prefetchDequeue();
    }

    private message(message: any) {
        var candles = _.map(message.data.candles, decodeCandle);
        logCandlesInfo(this.log, candles);
        if (candles.length)
            this.items[candles[0].timespan].mergeItems(candles);
        this.pendingPromise.resolve();
        this.prefetchDequeue();
    }
}


export class LiveDepth extends interfaces.LiveDepthDataSource implements ChannelSubscriptionRealtimeMixin {
    private marketID: string;
    private log: Logger;
    private data: SnapshotData<DepthData>;
    private channel: Channel;
    private pendingPrefetch: boolean;
    private pendingPromise = new PendingPromise<void>();

    constructor(marketID: string) {
        super();
        mixin.apply(this, new ChannelSubscriptionRealtimeMixin());

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

function logTradesInfo(log: Logger, trades: Trade[]) {
    var message = "got " + trades.length + " trades";
    if (trades.length)
        message += ", from " + trades[0].timestamp.toISOString() +
            " to " + trades[trades.length - 1].timestamp.toISOString();
    log.trace(message);

    if (trades.length) {
        var diff = trades[trades.length - 1].timestamp.getTime() - time.serverNow().getTime();
        if (diff > 0)
            log.info("last received trade is " + diff / 1000 + " sec in the future");
    }
}

function decodeCandle(c: any) {
    var candle = new Candle(new Date(c.start * 1000), c.timespan);

    candle.open = c.open && parseFloat(c.open);
    candle.close = c.close && parseFloat(c.close);
    candle.low = c.low && parseFloat(c.low);
    candle.high = c.high && parseFloat(c.high);
    candle.volume = c.volume && parseFloat(c.volume);
    candle.vwap = c.vwap && parseFloat(c.vwap);
    candle.count = c.count;

    candle.buy_open = c.buy_open && parseFloat(c.buy_open);
    candle.buy_close = c.buy_close && parseFloat(c.buy_close);
    candle.buy_low = c.buy_low && parseFloat(c.buy_low);
    candle.buy_high = c.buy_high && parseFloat(c.buy_high);
    candle.buy_volume = c.buy_volume && parseFloat(c.buy_volume);
    candle.buy_vwap = c.buy_vwap && parseFloat(c.buy_vwap);
    candle.buy_count = c.buy_count;

    candle.sell_open = c.sell_open && parseFloat(c.sell_open);
    candle.sell_close = c.sell_close && parseFloat(c.sell_close);
    candle.sell_low = c.sell_low && parseFloat(c.sell_low);
    candle.sell_high = c.sell_high && parseFloat(c.sell_high);
    candle.sell_volume = c.sell_volume && parseFloat(c.sell_volume);
    candle.sell_vwap = c.sell_vwap && parseFloat(c.sell_vwap);
    candle.sell_count = c.sell_count;

    return candle;
}

function logCandlesInfo(log: Logger, candles: Candle[]) {
    var message = "got " + candles.length + " candles";
    if (candles.length)
        message += " with timespan " + candles[0].timespan +
            ", from " + candles[0].start.toISOString() +
            " to " + candles[candles.length - 1].start.toISOString();
    log.trace(message);
}
