import fun = require("../utils/fun");
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
        var endpoints = _.map(sets, set => set.data.length ? [set.data[0], set.data[set.data.length - 1]] : []);
        var endKeys = _.map(_.flatten(endpoints, true), this.sortKey);
        var endPairs = _.map(_.range(endKeys.length - 1), i => [endKeys[i], endKeys[i + 1]]);
        var setsBetweenEachPair = _.map<any[], TemporalData<T>[]>(endPairs, fun.splat((a: any, b: any) => {
            return _.filter(sets, set => {
                return set.data.length &&
                    this.sortKey(set.data[0]) <= a && this.sortKey(set.data[set.data.length - 1]) >= b;
            });
        }));
        var data = _.flatten(_.map(setsBetweenEachPair, (localSets: TemporalData<T>[]) => {
            if (localSets.length === 1)
                return localSets[0].data;
            var allDataPoints = _.flatten(_.map(localSets, s => s.data), true);
            return _.sortBy(_.uniq(allDataPoints, this.uniqueKey), this.sortKey);
        }));
        return new TemporalData<T>(data);
    }
}


class OHLCVDataFormat extends TemporalDataFormat<Candle> {
    public extractTimestamp(dataPoint: Candle) {
        return dataPoint.start;
    }

    public sortKey(dataPoint: Candle) {
        return dataPoint.start;
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
        return dataPoint.timestamp;
    }

    public uniqueKey(dataPoint: Trade) {
        return dataPoint.id_from_exchange ||
            "" + dataPoint.timestamp.getTime() + dataPoint.flags + dataPoint.price + dataPoint.amount;
    }
}


export var ohlcvDataFormat: TemporalDataFormat<Candle> = new OHLCVDataFormat();

export var tradesDataFormat: TemporalDataFormat<Trade> = new TradesDataFormat();
