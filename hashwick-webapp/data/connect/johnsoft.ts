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
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import DepthData = models_.DepthData;
import DepthDataPoint = models_.DepthDataPoint;
import Trade = models_.Trade;
import Ticker = models_.Ticker;
import periodic_ = require("../periodic");
if (0) periodic_;
import PeriodicSnapshotDataFetcher = periodic_.PeriodicSnapshotDataFetcher;
import PeriodicTemporalDataFetcher = periodic_.PeriodicTemporalDataFetcher;


var apiURL = "//btcmarkets.johnsoft.com/api";
var statusIcon: StatusIcon;

export class LiveTickerDataSource extends interfaces.LiveTickerDataSource {
    private marketID: number;
    private interval: number;
    private log: Logger;
    private data: SnapshotData<Ticker>;
    private periodic: PeriodicSnapshotDataFetcher;

    constructor(marketID: number) {
        super();
        this.marketID = marketID;
        this.interval = 60;
        this.log = new Logger("data.connect.johnsoft.LiveTickerDataSource:" + marketID);
        this.periodic = new PeriodicSnapshotDataFetcher(this.interval, this);

        makeStatusIcon();
    }

    public wantRealtime() {
        this.periodic.increment();
        this.log.trace("realtime up to " + this.periodic.counter);
    }

    public unwantRealtime() {
        this.periodic.decrement();
        this.log.trace("realtime down to " + this.periodic.counter);
    }

    public getFromMemory() {
        return this.data;
    }

    public prefetch() {
        if (this.data && this.data.timestamp.getTime() + this.interval * 1000 > time.serverNow().getTime())
            return $.Deferred().resolve();
        return this.fetchUncached();
    }

    private fetchUncached() {
        this.log.trace("fetch");
        var status = statusIcon.logRequest("fetching ticker");
        return $.ajax({
            url: apiURL + "/market/" + this.marketID + "/liveticker",
            dataType: "json",
        }).then((data: LiveTickerResponse) => {
            this.log.trace("got snapshot");
            statusIcon.logResponse(status, "got ticker");

            this.data = new SnapshotData(time.serverNow(), decodeTicker(data.response));
            this.gotData.emit();
        }, (): any => {
            this.log.error("error fetching data");
            statusIcon.logError(status);
        });
    }
}

interface LiveTickerResponse {
    response: LiveTickerResponseInner;
}

interface LiveTickerResponseInner {
    timestamp: number;
    market_id: number;
    last: string;
    bid: string;
    ask: string;
}

function decodeTicker(response: LiveTickerResponseInner): Ticker {
    return {
        last: parseFloat(response.last),
        bid: parseFloat(response.bid),
        ask: parseFloat(response.ask),
    }
}


export class TradesDataSource extends interfaces.TradesDataSource {
    private log: Logger;
    private marketID: number;
    private interval: number;
    private items: RangeCache<Date, Trade>;
    private periodic: PeriodicTemporalDataFetcher;

    constructor(marketID: number) {
        super();
        this.marketID = marketID;
        this.interval = 60;
        this.log = new Logger("data.connect.johnsoft.TradesDataSource:" + marketID);
        this.items = new RangeCache<Date, Trade>(
            this.format.sortKey, this.format.uniqueKey, this.fetchUncached);
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
        this.periodic = new PeriodicTemporalDataFetcher(this.interval, this, 15 * 60);

        makeStatusIcon();
    }

    public wantRealtime() {
        this.periodic.increment();
        this.log.trace("realtime up to " + this.periodic.counter);
    }

    public unwantRealtime() {
        this.periodic.decrement();
        this.log.trace("realtime down to " + this.periodic.counter);
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        return this.items.prefetch(earliest, latest);
    }

    private fetchUncached = (earliest: Date, latest: Date) => {
        this.log.trace("fetch " + earliest.toISOString() + " to " + latest.toISOString());
        var ear = time.dateToTimestamp(earliest);
        var lat = time.dateToTimestamp(latest);
        var status = statusIcon.logRequest("fetching trades");
        return $.ajax({
            url: apiURL + "/market/" + this.marketID + "/trades?earliest=" + ear + "&latest=" + lat,
            dataType: "json",
        }).then((data: TradesResponse) => {
            var trades = data.response.trades;
            statusIcon.logResponse(status, "got " + trades.length + " trades");
            this.log.trace("got " + trades.length + " trades");

            return _.map(trades, convertTrade);
        }, (): any => {
            this.log.error("error fetching trades");
            statusIcon.logError(status);
        });
    };
}

interface TradesResponse {
    response: {
        trades: JohnsoftTrade[];
    };
}

interface JohnsoftTrade {
    timestamp: number;
    flags: number;
    price: string;
    amount: string;
    id_from_exchange: string;
}

function convertTrade(trade: JohnsoftTrade) {
    return new Trade(time.timestampToDate(trade.timestamp), trade.flags,
        parseFloat(trade.price), parseFloat(trade.amount), trade.id_from_exchange);
}


export class OHLCVDataSource extends interfaces.OHLCVDataSource {
    private log: Logger;
    private marketID: number;
    private interval: number;
    private items: RangeCache<Date, Candle>;
    private periodic: PeriodicTemporalDataFetcher;

    constructor(marketID: number, period: number) {
        super();
        this.marketID = marketID;
        this.interval = 60;
        this.period = period;
        this.log = new Logger("data.connect.johnsoft.OHLCVDataSource:" + marketID + ":" + period);
        this.items = new RangeCache<Date, Candle>(
            this.format.sortKey, this.format.uniqueKey, this.fetchUncached);
        this.items.gotData.attach(this.gotData.emit.bind(this.gotData));
        this.periodic = new PeriodicTemporalDataFetcher(this.interval, this, 60 * 60);

        makeStatusIcon();
    }

    public wantRealtime() {
        this.periodic.increment();
        this.log.trace("realtime up to " + this.periodic.counter);
    }

    public unwantRealtime() {
        this.periodic.decrement();
        this.log.trace("realtime down to " + this.periodic.counter);
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return new TemporalData(this.items.getFromMemory(earliest, latest));
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        return this.items.prefetch(earliest, latest);
    }

    private fetchUncached = (earliest: Date, latest: Date) => {
        this.log.trace("fetch " + earliest.toISOString() + " to " + latest.toISOString());
        var ear = time.dateToTimestamp(earliest);
        var lat = time.dateToTimestamp(latest);
        var status = statusIcon.logRequest("fetching candles");
        return $.ajax({
            url: apiURL + "/market/" + this.marketID + "/ohlcv?period=" +
                this.period + "&earliest=" + ear + "&latest=" + lat,
            dataType: "json",
        }).then((data: OHLCVResponse) => {
            var candles = data.response.candles;
            this.log.trace("got " + candles.length + " candles");
            statusIcon.logResponse(status, "got " + candles.length + " candles");

            _.each(candles, fixCandle);
            return candles;
        }, (): any => {
            this.log.error("error fetching candles");
            statusIcon.logError(status);
        });
    };
}

interface OHLCVResponse {
    response: {
        candles: Candle[];
    };
}

function fixCandle(candle: Candle) {
    candle.start = time.timestampToDate(<any>candle.start);
    candle.end = time.timestampToDate(<any>candle.end);
    candle.open = parseFloat(<any>candle.open);
    candle.close = parseFloat(<any>candle.close);
    candle.buy_open = parseFloat(<any>candle.buy_open);
    candle.buy_close = parseFloat(<any>candle.buy_close);
    candle.buy_low = parseFloat(<any>candle.buy_low);
    candle.buy_high = parseFloat(<any>candle.buy_high);
    candle.buy_volume = parseFloat(<any>candle.buy_volume);
    candle.buy_vwap = parseFloat(<any>candle.buy_vwap);
    candle.buy_count = parseFloat(<any>candle.buy_count);
    candle.sell_open = parseFloat(<any>candle.sell_open);
    candle.sell_close = parseFloat(<any>candle.sell_close);
    candle.sell_low = parseFloat(<any>candle.sell_low);
    candle.sell_high = parseFloat(<any>candle.sell_high);
    candle.sell_volume = parseFloat(<any>candle.sell_volume);
    candle.sell_vwap = parseFloat(<any>candle.sell_vwap);
    candle.sell_count = parseFloat(<any>candle.sell_count);

    candle.timespan = (candle.end.getTime() - candle.start.getTime()) / 1000;
    candle.low = candle.buy_low < candle.sell_low ? candle.buy_low : candle.sell_low;
    candle.high = candle.buy_high > candle.sell_high ? candle.buy_high : candle.sell_high;
    candle.volume = candle.buy_volume + candle.sell_volume;
    if (candle.volume)
        candle.vwap = (candle.buy_vwap * candle.buy_volume + candle.sell_vwap * candle.sell_volume) / candle.volume;
    else
        candle.vwap = (candle.buy_vwap + candle.sell_vwap) / 2;
    candle.count = candle.buy_count + candle.sell_count;
}


export class LiveDepthDataSource extends interfaces.LiveDepthDataSource {
    private marketID: number;
    private interval: number;
    private log: Logger;
    private data: SnapshotData<DepthData>;
    private periodic: PeriodicSnapshotDataFetcher;

    constructor(marketID: number) {
        super();
        this.marketID = marketID;
        this.interval = 60;
        this.log = new Logger("data.connect.johnsoft.LiveDepthDataSource:" + marketID);
        this.periodic = new PeriodicSnapshotDataFetcher(this.interval, this);

        makeStatusIcon();
    }

    public wantRealtime() {
        this.periodic.increment();
        this.log.trace("realtime up to " + this.periodic.counter);
    }

    public unwantRealtime() {
        this.periodic.decrement();
        this.log.trace("realtime down to " + this.periodic.counter);
    }

    public getFromMemory() {
        return this.data;
    }

    public prefetch() {
        if (this.data && this.data.timestamp.getTime() + this.interval * 1000 > time.serverNow().getTime())
            return $.Deferred().resolve();
        return this.fetchUncached();
    }

    private fetchUncached() {
        this.log.trace("fetch");
        var status = statusIcon.logRequest("fetching depth");
        return $.ajax({
            url: apiURL + "/market/" + this.marketID + "/livedepth",
            dataType: "json",
        }).then((data: LiveDepthResponse) => {
            this.log.trace("got data");
            statusIcon.logResponse(status, "got depth");

            this.data = new SnapshotData(time.serverNow(), data.response);
            fixDepthData(this.data.data);
            this.gotData.emit();
        }, (): any => {
            this.log.error("error fetching data");
            statusIcon.logError(status);
        });
    }
}


interface LiveDepthResponse {
    response: DepthData;
}

function fixDepthData(depth: DepthData) {
    function fixer(point: DepthDataPoint) {
        point.amount = parseFloat(<any>point.amount);
        point.price = parseFloat(<any>point.price);
    }
    _.each(depth.bids, fixer);
    _.each(depth.asks, fixer);
}


function makeStatusIcon() {
    if (!statusIcon)
        statusIcon = frame.addFooterIcon("Johnsoft AJAX polling", "/static/icons/johnsoft.png");
}
