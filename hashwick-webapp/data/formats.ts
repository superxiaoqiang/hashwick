import compsci = require("../../lib/calc/compsci");
import models_ = require("./models");
if (0) models_;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import Trade = models_.Trade;


export interface DataFormat<T> { }

export interface SnapshotDataFormat<T> { }

export class TemporalDataFormat<T> implements DataFormat<T> {
    public extractTimestamp(dataPoint: T): Date { throw 0; }

    public sortKey(dataPoint: T): any { throw 0; }

    public uniqueKey(dataPoint: T): any { throw 0; }

    public combineDataSets(sets: TemporalData<T>[]): TemporalData<T> {
        var data = compsci.rangeMerge(_.map(sets, set => set.data), this.sortKey, this.uniqueKey);
        return new TemporalData<T>(data);
    }
}


class OHLCVDataFormat extends TemporalDataFormat<Candle> {
    public extractTimestamp(dataPoint: Candle) {
        return dataPoint.start;
    }

    public sortKey(dataPoint: Candle) {
        return dataPoint.start.getTime();
    }

    public uniqueKey(dataPoint: Candle) {
        return dataPoint.start.getTime();
    }
}


class TradesDataFormat extends TemporalDataFormat<Trade> {
    public extractTimestamp(dataPoint: Trade) {
        return dataPoint.timestamp;
    }

    public sortKey(dataPoint: Trade) {
        return dataPoint.timestamp.getTime();
    }

    public uniqueKey(dataPoint: Trade) {
        return dataPoint.id_from_exchange ||
            "" + dataPoint.timestamp.getTime() + dataPoint.flags + dataPoint.price + dataPoint.amount;
    }
}


export var ohlcvDataFormat: TemporalDataFormat<Candle> = new OHLCVDataFormat();

export var tradesDataFormat: TemporalDataFormat<Trade> = new TradesDataFormat();
