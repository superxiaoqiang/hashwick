import CandleBuilder = require("../../lib/calc/candleBuilder")
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import time = require("../utils/time");
import context_ = require("./context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import interfaces_ = require("./interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import LiveTickerDataSource = interfaces_.LiveTickerDataSource;
import LiveDepthDataSource = interfaces_.LiveDepthDataSource;
import TradesDataSource = interfaces_.TradesDataSource;
import OHLCVDataSource = interfaces_.OHLCVDataSource;
import models_ = require("./models");
if (0) models_;
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import Ticker = models_.Ticker;
import Trade = models_.Trade;
import serialization = require("./serialization");


// TODO: move to project-wide module
export function convertTradesToTicks(trades: Trade[]) {
    var ret: Trade[] = [];
    var curTick: Trade;

    _.each(trades, trade => {
        var BUYSELL = Trade.BUY | Trade.SELL;

        if (curTick) {
            if (((trade.flags & BUYSELL) === curTick.flags) && trade.price === curTick.price) {
                curTick.amount += trade.amount;
                return;
            }
            ret.push(curTick);
        }

        curTick = new Trade(trade.timestamp, trade.flags & BUYSELL,
            trade.price, trade.amount, null);
    });
    if (curTick)
        ret.push(curTick);
    return ret;
}


class TradesToTicksDataSource extends TradesDataSource {
    public static type = "tradesToTicks";

    private dataSource: Capsule<TradesDataSource>;

    public static deserialize(context: DeserializationContext, structure: SerializedTradesToTicksDataSource) {
        var dataSource = <Capsule<TradesDataSource>>context.unsealDataSource(structure.dataSource);
        return new this(dataSource);
    }

    constructor(dataSource: Capsule<TradesDataSource>) {
        super();
        this.dataSource = dataSource;
        this.dataSource.item.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public serialize(context: SerializationContext): SerializedTradesToTicksDataSource {
        return {
            type: TradesToTicksDataSource.type,
            dataSource: context.sealDataSource(this.dataSource),
        };
    }

    public description() {
        return this.dataSource.item.description() + " ticks";
    }

    public wantRealtime() {
        this.dataSource.item.wantRealtime();
    }

    public unwantRealtime() {
        this.dataSource.item.unwantRealtime();
    }

    public getFromMemory(earliest: Date, latest: Date) {
        var original = this.dataSource.item.getFromMemory(earliest, latest);
        return new TemporalData<Trade>(convertTradesToTicks(original.data));
    }

    public prefetch(earliest: Date, latest: Date) {
        return this.dataSource.item.prefetch(earliest, latest);
    }
}

interface SerializedTradesToTicksDataSource extends SerializedDataSource {
    dataSource: CapsuleRef<SerializedDataSource>;
}

serialization.dataSourceClasses[TradesToTicksDataSource.type] = TradesToTicksDataSource;


export class TradesToCandlesDataSource extends OHLCVDataSource {
    private trades: TradesDataSource;

    constructor(tradesDataSource: TradesDataSource) {
        super();
        this.trades = tradesDataSource;
        this.trades.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        this.trades.wantRealtime();
    }

    public unwantRealtime() {
        this.trades.unwantRealtime();
    }

    public getFromMemory(earliest: Date, latest: Date, period: number) {
        var trades = this.trades.getFromMemory(earliest, latest);

        var candles: Candle[] = [];
        var builder = new CandleBuilder(period);
        builder.onCandle = candles.push.bind(candles);
        _.each(trades.data, builder.feedTrade.bind(builder));
        builder.sendIncompleteCandle();

        return new TemporalData<Candle>(candles);
    }

    public prefetch(earliest: Date, latest: Date, period: number) {
        return this.trades.prefetch(earliest, latest);
    }
}


export class InferLiveTickerDataSource extends LiveTickerDataSource {
    private trades: TradesDataSource;
    private depth: LiveDepthDataSource;

    constructor(tradesDataSource: TradesDataSource, depthDataSource: LiveDepthDataSource) {
        super();
        this.trades = tradesDataSource;
        this.depth = depthDataSource;
        this.trades.gotData.attach(this.gotData.emit.bind(this.gotData));
        this.depth.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        this.trades.wantRealtime();
        this.depth.wantRealtime();
    }

    public unwantRealtime() {
        this.trades.unwantRealtime();
        this.depth.unwantRealtime();
    }

    public getFromMemory() {
        // TODO: somehow get just the latest trade regardless of time window size
        var latest = time.serverNow();
        var earliest = new Date(latest.getTime() - 5 * 60 * 1000);
        var trades = this.trades.getFromMemory(earliest, latest);
        var latestTrade = trades && trades.data[trades.data.length - 1];

        var depth = this.depth.getFromMemory();

        if (latestTrade && depth && depth.data.bids.length && depth.data.asks.length) {
            var timestamp = new Date(Math.max(latestTrade.timestamp.getTime(),
                                              depth.timestamp.getTime()));
            var ticker = new Ticker(latestTrade.price,
                                    depth.data.bids[0].price, depth.data.asks[0].price);
            return new SnapshotData(timestamp, ticker);
        }
    }

    public prefetch() {
        var latest = time.serverNow();
        var earliest = new Date(latest.getTime() - 5 * 60 * 1000);
        return Promise.settle(<Promise<void>[]>[
            this.trades.prefetch(earliest, latest),
            this.depth.prefetch(),
        ]).then(() => { });
    }
}
