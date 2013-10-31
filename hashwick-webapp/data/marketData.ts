import CandleResampler = require("../../lib/calc/candleResampler");
import logger_ = require("../logger");
if (0) logger_;
import Logger = logger_.Logger;
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import context_ = require("./context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import dataStack_ = require("./dataStack");
if (0) dataStack_;
import SnapshotDataStack = dataStack_.SnapshotDataStack;
import TemporalDataStack = dataStack_.TemporalDataStack;
import interfaces = require("./interfaces");
import markets_ = require("./markets");
if (0) markets_;
import Market = markets_.Market;
import SerializedMarket = markets_.SerializedMarket;
import models_ = require("./models");
if (0) models_;
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import DepthData = models_.DepthData;
import Ticker = models_.Ticker;
import Trade = models_.Trade;
import serialization = require("./serialization");


class MarketLiveTickerDataSource extends interfaces.LiveTickerDataSource {
    public static type = "marketLiveTicker";

    private market: Capsule<Market>;
    private log: Logger;
    private dataStack: SnapshotDataStack<Ticker>;

    public static deserialize(context: DeserializationContext, structure: SerializedMarketLiveTickerDataSource) {
        var market = context.unsealMarket(structure.market);
        return new this(market);
    }

    constructor(market: Capsule<Market>) {
        super();
        this.market = market;

        this.log = new Logger("data.marketData.MarketLiveTickerDataSource:" + market.item.cacheKey());

        this.dataStack = new SnapshotDataStack<Ticker>(this.format);
        this.dataStack.gotData.attach(this.gotData.emit.bind(this.gotData));
        _.each(market.item.liveTickerDataSources, dataSource => {
            this.dataStack.addSource(dataSource);
        });
    }

    public serialize(context: SerializationContext): SerializedMarketLiveTickerDataSource {
        return {
            type: MarketLiveTickerDataSource.type,
            market: context.sealMarket(this.market),
        };
    }

    public description() {
        return this.market.item.description + " ticker";
    }

    public wantRealtime() {
        this.log.trace("wantRealtime");
        this.dataStack.wantRealtime();
    }

    public unwantRealtime() {
        this.log.trace("unwantRealtime");
        this.dataStack.unwantRealtime();
    }

    public getFromMemory() {
        return this.dataStack.getFromMemory();
    }

    public prefetch() {
        this.log.trace("prefetch");
        return this.dataStack.prefetch();
    }
}

interface SerializedMarketLiveTickerDataSource extends interfaces.SerializedDataSource {
    market: CapsuleRef<SerializedMarket>;
}


export class MarketTradesDataSource extends interfaces.TradesDataSource {
    public static type = "marketTrades";

    private market: Capsule<Market>;
    private log: Logger;
    private dataStack: TemporalDataStack<Trade>;

    public static deserialize(context: DeserializationContext, structure: SerializedMarketTradesDataSource) {
        var market = context.unsealMarket(structure.market);
        return new this(market);
    }

    constructor(market: Capsule<Market>) {
        super();
        this.market = market;

        this.log = new Logger("data.marketData.MarketTradesDataSource:" + market.item.cacheKey());

        this.dataStack = new TemporalDataStack<Trade>(this.format);
        this.dataStack.gotData.attach(this.gotData.emit.bind(this.gotData));
        _.each(market.item.tradesDataSources, dataSource => {
            this.dataStack.addSource(dataSource);
        });
    }

    public serialize(context: SerializationContext): SerializedMarketTradesDataSource {
        return {
            type: MarketTradesDataSource.type,
            market: context.sealMarket(this.market),
        };
    }

    public description() {
        return this.market.item.description + " trades";
    }

    public wantRealtime() {
        this.log.trace("wantRealtime");
        this.dataStack.wantRealtime();
    }

    public unwantRealtime() {
        this.log.trace("unwantRealtime");
        this.dataStack.unwantRealtime();
    }

    public getFromMemory(earliest: Date, latest: Date) {
        return this.dataStack.getFromMemory(earliest, latest);
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        return this.dataStack.prefetch(earliest, latest);
    }
}

export interface SerializedMarketTradesDataSource extends interfaces.SerializedDataSource {
    market: CapsuleRef<SerializedMarket>;
}


class MarketOHLCVDataSource extends interfaces.OHLCVDataSource {
    public static type = "marketOHLCV";

    private market: Capsule<Market>;
    private log: Logger;
    private dataStack: TemporalDataStack<Candle>;

    public static deserialize(context: DeserializationContext, structure: SerializedMarketOHLCVDataSource) {
        var market = context.unsealMarket(structure.market);
        var period = structure.period;
        return new this(market, period);
    }

    constructor(market: Capsule<Market>, period: number) {
        super();
        this.market = market;
        this.period = period;

        this.log = new Logger("data.marketData.MarketOHLCVDataSource:" + market.item.cacheKey());

        this.dataStack = new TemporalDataStack<Candle>(this.format);
        this.dataStack.gotData.attach(this.gotData.emit.bind(this.gotData));
        _.each(market.item.ohlcvDataSources, dataSource => {
            this.dataStack.addSource(dataSource);
        });
    }

    public serialize(context: SerializationContext): SerializedMarketOHLCVDataSource {
        return {
            type: MarketOHLCVDataSource.type,
            market: context.sealMarket(this.market),
            period: this.period,
        };
    }

    public description() {
        return this.market.item.description + " candles";
    }

    public wantRealtime() {
        this.log.trace("wantRealtime");
        this.dataStack.wantRealtime();
    }

    public unwantRealtime() {
        this.log.trace("unwantRealtime");
        this.dataStack.unwantRealtime();
    }

    public getFromMemory(earliest: Date, latest: Date): TemporalData<Candle> {
        var data = this.dataStack.getFromMemory(earliest, latest);

        var resampler = new CandleResampler(this.period);
        var ret: Candle[] = [];
        resampler.onCandle = ret.push.bind(ret);
        _.each(data.data, resampler.feedCandle.bind(resampler));
        resampler.sendIncompleteCandle();

        return new TemporalData<Candle>(ret);
    }

    public prefetch(earliest: Date, latest: Date) {
        this.log.trace("prefetch " + earliest.toISOString() + " to " + latest.toISOString());
        return this.dataStack.prefetch(earliest, latest);
    }
}

interface SerializedMarketOHLCVDataSource extends interfaces.SerializedDataSource {
    market: CapsuleRef<SerializedMarket>;
    period: number;
}


class MarketLiveDepthDataSource extends interfaces.LiveDepthDataSource {
    public static type = "marketLiveDepth";

    private market: Capsule<Market>;
    private log: Logger;
    private dataStack: SnapshotDataStack<DepthData>;

    public static deserialize(context: DeserializationContext, structure: SerializedMarketLiveDepthDataSource) {
        var market = context.unsealMarket(structure.market);
        return new this(market);
    }

    constructor(market: Capsule<Market>) {
        super();
        this.market = market;

        this.log = new Logger("data.marketData.MarketLiveDepthDataSource:" + market.item.cacheKey());

        this.dataStack = new SnapshotDataStack<DepthData>(this.format);
        this.dataStack.gotData.attach(this.gotData.emit.bind(this.gotData));
        _.each(market.item.liveDepthDataSources, dataSource => {
            this.dataStack.addSource(dataSource);
        });
    }

    public serialize(context: SerializationContext): SerializedMarketLiveDepthDataSource {
        return {
            type: MarketLiveDepthDataSource.type,
            market: context.sealMarket(this.market),
        };
    }

    public description() {
        return this.market.item.description + " depth";
    }

    public wantRealtime() {
        this.log.trace("wantRealtime");
        this.dataStack.wantRealtime();
    }

    public unwantRealtime() {
        this.log.trace("unwantRealtime");
        this.dataStack.unwantRealtime();
    }

    public getFromMemory() {
        return this.dataStack.getFromMemory();
    }

    public prefetch() {
        this.log.trace("prefetch");
        return this.dataStack.prefetch();
    }
}

interface SerializedMarketLiveDepthDataSource extends interfaces.SerializedDataSource {
    market: CapsuleRef<SerializedMarket>;
}


serialization.dataSourceClasses[MarketLiveTickerDataSource.type] = MarketLiveTickerDataSource;
serialization.dataSourceClasses[MarketTradesDataSource.type] = MarketTradesDataSource;
serialization.dataSourceClasses[MarketOHLCVDataSource.type] = MarketOHLCVDataSource;
serialization.dataSourceClasses[MarketLiveDepthDataSource.type] = MarketLiveDepthDataSource;
