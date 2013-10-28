import clingyWebSocket_ = require("../../../lib/clingyWebSocket");
if (0) clingyWebSocket_;
import ClingyWebSocket = clingyWebSocket_.ClingyWebSocket;
import ClingyWebSocketOptions = clingyWebSocket_.ClingyWebSocketOptions;
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
import Ticker = models_.Ticker;
import Trade = models_.Trade;


var log = new Logger("data.connect.flugelhorn");
var statusIcon: StatusIcon;


class Socketeer {
    private socket: ClingyWebSocket;
    private established: boolean;
    private handlers: { [channel: string]: (data: any) => void; } = {};

    public connect() {
        if (this.socket)
            return;
        this.socket = new ClingyWebSocket({
            maker: () => new WebSocket(config.flugelhornSocket),
            log: log,
        });
        this.socket.onopen = this.onConnect.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        statusIcon = frame.addFooterIcon("Flugelhorn", "/static/icons/flugelhorn.ico");
    }

    private disconnect() {
        this.socket.close();
        this.socket = null;
        frame.removeFooterIcon(statusIcon);
        this.established = false;
    }

    public subscribe(channel: string, handler: (data: any) => void) {
        this.connect();
        log.debug("subscribing to " + channel);
        this.handlers[channel] = handler;
        if (this.established)
            this.socket.send(JSON.stringify({command: "subscribe", channel: channel}));
    }

    public unsubscribe(channel: string) {
        log.debug("unsubscribing from " + channel);
        if (this.established)
            this.socket.send(JSON.stringify({command: "unsubscribe", channel: channel}));
        delete this.handlers[channel];
        if (!_.size(this.handlers))
            this.disconnect();
    }

    private onConnect() {
        this.established = true;
        _.each(this.handlers, (handler, channel) => {
            this.socket.send(JSON.stringify({command: "subscribe", channel: channel}));
        });
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


export class LiveTickerDataSource extends interfaces.LiveTickerDataSource {
    private marketID: string;
    private log: Logger;
    private realtime: number;
    private data: SnapshotData<Ticker>;

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.ticker:" + marketID);
        this.realtime = 0;
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe("ticker:" + this.marketID, this.message.bind(this));
        this.log.trace("realtime up to " + this.realtime);
    }

    public unwantRealtime() {
        if (!-- this.realtime)
            socketeer.unsubscribe("ticker:" + this.marketID);
        this.log.trace("realtime down to " + this.realtime);
    }

    public getFromMemory() {
        return this.data;
    }

    private message(message: any) {
        var ticker = new Ticker();
        ticker.last = parseFloat(message.data.last);
        ticker.bid = parseFloat(message.data.bid);
        ticker.ask = parseFloat(message.data.ask);
        var timestamp = new Date(message.data.timestamp * 1000);
        this.data = new SnapshotData(timestamp, ticker);
        this.gotData.emit();
    }
}


export class TradesDataSource extends interfaces.TradesDataSource {
    private marketID: string;
    private log: Logger;
    private realtime: number;
    private items: RangeCache<Date, Trade>;

    constructor(marketID: string) {
        super();
        this.marketID = marketID;
        this.log = new Logger("data.connect.flugelhorn.trades:" + marketID);
        this.realtime = 0;
        this.items = new RangeCache<Date, Trade>(this.format.sortKey, () => $.Deferred().resolve());
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        if (!this.realtime++)
            socketeer.subscribe("trades:" + this.marketID, this.message.bind(this));
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
        var trades = _.map(message.data.trades, (trade: any) => {
            return new Trade(new Date(trade.timestamp * 1000), trade.flags,
                parseFloat(trade.price), parseFloat(trade.amount), trade.id_from_exchange);
        });
        this.items.mergeItems(trades);
    }
}
