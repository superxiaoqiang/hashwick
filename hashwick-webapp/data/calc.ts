import CandleBuilder = require("../../lib/calc/candleBuilder")
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import context_ = require("./context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import interfaces_ = require("./interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import TradesDataSource = interfaces_.TradesDataSource;
import OHLCVDataSource = interfaces_.OHLCVDataSource;
import models_ = require("./models");
if (0) models_;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import Trade = models_.Trade;
import serialization = require("./serialization");


// TODO: move to project-wide module
export function convertTradesToTicks(trades: Trade[]) {
    var ret: Trade[] = [];
    var curTick: Trade;
    var BUYSELL = Trade.BUY | Trade.SELL

    _.each(trades, trade => {
        if (!curTick) {
            curTick = trade;
            return;
        }

        var tradeFlags = trade.flags & BUYSELL;
        if ((!tradeFlags || tradeFlags === curTick.flags) && trade.price === curTick.price) {
            curTick.amount += trade.amount;
        } else {
            if (curTick)
                ret.push(curTick);
            var flags = trade.flags & BUYSELL;
            curTick = new Trade(trade.timestamp, flags, trade.price, trade.amount, null);
        }
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

    constructor(tradesDataSource: TradesDataSource, period: number) {
        super();
        this.trades = tradesDataSource;
        this.trades.gotData.attach(this.gotData.emit.bind(this.gotData));
        this.period = period;
    }

    public wantRealtime() {
        this.trades.wantRealtime();
    }

    public unwantRealtime() {
        this.trades.unwantRealtime();
    }

    public getFromMemory(earliest: Date, latest: Date) {
        var trades = this.trades.getFromMemory(earliest, latest);
        var candles: Candle[] = [];
        var builder = new CandleBuilder(this.period);
        builder.onCandle = candles.push.bind(candles);
        _.each(trades.data, builder.feedTrade.bind(builder));
        builder.sendIncompleteCandle();
        return new TemporalData<Candle>(candles);
    }

    public prefetch(earliest: Date, latest: Date) {
        return this.trades.prefetch(earliest, latest);
    }
}
