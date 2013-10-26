import logger_ = require("../../logger");
if (0) logger_;
import Logger = logger_.Logger;
import rangeCache_ = require("../../../lib/rangeCache");
if (0) rangeCache_;
import RangeCache = rangeCache_.RangeCache;
import frame = require("../../ui/frame");
import statusIcon_ = require("../../ui/statusIcon");
if (0) statusIcon_;
import StatusIcon = statusIcon_.StatusIcon;
import time = require("../../utils/time");
import interfaces = require("../interfaces");
import models_ = require("../models");
if (0) models_;
import TemporalData = models_.TemporalData;
import Trade = models_.Trade;


var log = new Logger("data.connect.bitstamp");
var statusIcon: StatusIcon;

class Socketeer {
    private socket: WebSocket;
    private established: boolean;
    private handlers: { [channel: string]: (event: string, data: any) => void; } = {};

    public connect() {
        if (this.socket)
            return;
        this.socket = new WebSocket("wss://ws.pusherapp.com/app/de504dc5763aeef9ff52?protocol=6&client=js&version=2.1.2&flash=false");
        this.socket.onopen = this.onConnect;
        this.socket.onmessage = this.onMessage;
        statusIcon = frame.addFooterIcon("Bitstamp websocket", "/static/icons/bitstamp.ico");
    }

    private disconnect() {
        this.established = false;
        this.socket.close();
        this.socket = null;
        frame.removeFooterIcon(statusIcon);
    }

    public subscribe(channel: string, handler: (event: string, data: any) => void) {
        this.connect();
        log.debug("subscribing to channel " + channel);
        this.handlers[channel] = handler;
        if (this.established)
            this.socket.send(JSON.stringify({event: "pusher:subscribe", data: {channel: channel}}));
    }

    public unsubscribe(channel: string) {
        log.debug("unsubscribing from channel " + channel);
        if (this.established)
            this.socket.send(JSON.stringify({event: "pusher:unsubscribe", data: {channel: channel}}));
        delete this.handlers[channel];
        if (!_.size(this.handlers))
            this.disconnect();
    }

    private onConnect = (data: any) => {
        log.trace("connected");
    };

    private onMessage = (event: MessageEvent) => {
        var data = JSON.parse(event.data);
        statusIcon.logPacket((data.channel || "[none]") + " \u2014 " + data.event);
        if (data.event === "pusher:connection_established") {
            log.trace("got connected message");
            this.established = true;
            _.each(this.handlers, (handler, channel) => {
                this.socket.send(JSON.stringify({event: "pusher:subscribe", data: {channel: channel}}));
            });
        } else {
            var handler = this.handlers[data.channel];
            if (handler)
                handler(data.event, JSON.parse(data.data));
        }
    };
}

var socketeer = new Socketeer();

export class TradesDataSource extends interfaces.TradesDataSource {
    private channel: string;
    private realtime: number;
    private items: RangeCache<Date, Trade>;

    constructor() {
        super();
        this.channel = "live_trades";
        this.realtime = 0;
        this.items = new RangeCache<Date, Trade>(this.format.sortKey, () => $.Deferred().resolve());
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

    private handle = (event: string, data: any) => {
        if (event === "trade") {
            log.trace("got trade, price=" + data.price + " amount=" + data.amount);
            var trade = new Trade(time.serverNow(), 0, data.price, data.amount, data.id.toString());
            this.items.mergeItems([trade]);  // this calls gotData for us
        }
    };

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }
}
