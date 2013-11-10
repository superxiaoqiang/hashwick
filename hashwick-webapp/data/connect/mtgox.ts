import logger_ = require("../../logger");
if (0) logger_;
import Logger = logger_.Logger;
import frame = require("../../ui/frame");
import statusIcon_ = require("../../ui/statusIcon");
if (0) statusIcon_;
import StatusIcon = statusIcon_.StatusIcon;
import rangeCache_ = require("../../../lib/rangeCache");
if (0) rangeCache_;
import RangeCache = rangeCache_.RangeCache;
import time = require("../../utils/time");
import interfaces = require("../interfaces");
import models_ = require("../models");
if (0) models_;
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;
import Ticker = models_.Ticker;
import Trade = models_.Trade;


var log = new Logger("data.connect.mtgox");

//class IOSocketeer {
//    private socket: Socket;
//    private handlers: { [channel: string]: (data: any) => void; } = {};
//
//    public connect() {
//        if (this.socket)
//            return;
//        var url = "https://socketio.mtgox.com/mtgox";
//        log.debug("connecting to " + url);
//        this.socket = io.connect(url);
//        this.socket.on("connect", this.onConnect);
//        this.socket.on("message", this.onMessage);
//    }
//
//    public subscribe(channel: string, handler: (data: any) => void) {
//        this.connect();
//        log.debug("subscribing to channel " + channel);
//        this.handlers[channel] = handler;
//        this.socket.send(JSON.stringify({op: "subscribe", channel: channel}));
//    }
//
//    public unsubscribe(channel: string) {
//        log.debug("unsubscribing from channel " + channel);
//        this.socket.send(JSON.stringify({op: "unsubscribe", channel: channel}));
//        delete this.handlers[channel];
//        // XXX: should disconnect from socket when last subscription is gone
//    }
//
//    private onConnect = (data: any) => {
//        log.trace("connected");
//    };
//
//    private onMessage = (data: any) => {
//        log.trace("got message on " + data.channel + " - " + data.op);
//        if (data.op === "private") {
//            var handler = this.handlers[data.channel];
//            if (handler)
//                handler(data);
//        }
//    };
//}

class WebSocketeer {
    private socket: WebSocket;
    private handlers: { [channel: string]: (data: any) => void; } = {};
    private statusIcon: StatusIcon;

    public connect() {
        if (this.socket)
            return;
        this.socket = new WebSocket("wss://websocket.mtgox.com/mtgox");
        this.socket.onopen = this.onConnect;
        this.socket.onmessage = this.onMessage;
        this.statusIcon = frame.addFooterIcon("Mt. Gox websocket", "/static/icons/mtgox.ico");
    }

    private disconnect() {
        if (!this.socket)
            return;
        this.socket.close();
        this.socket = null;
        frame.removeFooterIcon(this.statusIcon);
    }

    public subscribe(channel: string, handler: (data: any) => void) {
        this.connect();
        log.debug("subscribing to channel " + channel);
        this.handlers[channel] = handler;
        if (this.socket.readyState === WebSocket.OPEN)
            this.socket.send(JSON.stringify({op: "subscribe", channel: channel}));
    }

    public unsubscribe(channel: string) {
        log.debug("unsubscribing from channel " + channel);
        if (this.socket.readyState === WebSocket.OPEN)
            this.socket.send(JSON.stringify({op: "unsubscribe", channel: channel}));
        delete this.handlers[channel];
        if (!_.size(this.handlers))
            this.disconnect();
    }

    private onConnect = (data: any) => {
        log.trace("connected");
        this.statusIcon.logPacket("connected");
        _.each(this.handlers, (handler, channel) => {
            this.socket.send(JSON.stringify({op: "subscribe", channel: channel}));
        });
    };

    private onMessage = (event: MessageEvent) => {
        var data = JSON.parse(event.data);
        this.statusIcon.logPacket(data.channel_name);
        if (data.op === "private") {
            var handler = this.handlers[data.channel];
            if (handler)
                handler(data);
        } else if (data.op === "remark") {
            log.trace("got event, op=remark, message=" + data.message);
        } else {
            log.info("got event, op=" + data.op);
        }
    };
}

var socketeer = new WebSocketeer();

function convertTimestamp(when: string) {
    return new Date(parseInt(when) / 1000);
}

function convertMoneyObject(what: { value: string; }) {
    return parseFloat(what.value);
}

export class LiveTickerDataSource extends interfaces.LiveTickerDataSource {
    private channel: string;
    private realtime: number;
    private snapshot: SnapshotData<Ticker>;

    constructor(channel: string) {
        super();
        this.channel = channel;
        this.realtime = 0;
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe(this.channel, this.handle);
    }

    public unwantRealtime() {
        if (!--this.realtime)
            socketeer.unsubscribe(this.channel);
    }

    private handle = (data: any) => {
        log.trace("got ticker, last=" + data.ticker.last.value);
        this.snapshot = new SnapshotData<Ticker>(convertTimestamp(data.ticker.now), {
            last: convertMoneyObject(data.ticker.last),
            bid: convertMoneyObject(data.ticker.buy),
            ask: convertMoneyObject(data.ticker.sell),
        });
        this.gotData.emit();
    };

    public getFromMemory() {
        return this.snapshot;
    }
}

export class TradesDataSource extends interfaces.TradesDataSource {
    private channel: string;
    private currency: string;
    private realtime: number;
    private items: RangeCache<Date, Trade>;

    constructor(channel: string, currency: string) {
        super();
        this.channel = channel;
        this.currency = currency;
        this.realtime = 0;
        this.items = new RangeCache<Date, Trade>(
            this.format.sortKey, this.format.uniqueKey, () => Promise.fulfilled());
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe(this.channel, this.handle);
    }

    public unwantRealtime() {
        if (!--this.realtime)
            socketeer.unsubscribe(this.channel);
    }

    private handle = (data: any) => {
        if (data.trade.price_currency !== this.currency)
            return;

        log.trace("got trade, price=" + data.trade.price + " amount=" + data.trade.amount);
        var timestamp = time.timestampToDate(data.trade.date);
        var properties = data.trade.properties.split(",");
        var flags = (data.trade.trade_type === "bid" ? Trade.BUY : 0) |
            (data.trade.trade_type === "ask" ? Trade.SELL : 0) |
            (_.contains(properties, "limit") ? Trade.LIMIT : 0) |
            (_.contains(properties, "market") ? Trade.MARKET : 0);

        var trade = new Trade(timestamp, flags,
            parseFloat(data.trade.price), parseFloat(data.trade.amount), data.trade.tid);
        this.items.mergeItems([trade]);  // this calls gotData for us
    };

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }
}
