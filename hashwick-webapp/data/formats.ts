import models_ = require("./models");
if (0) models_;
import TemporalData = models_.TemporalData;
import Candle = models_.Candle;
import Trade = models_.Trade;


export interface DataFormat<T> { }

export interface SnapshotDataFormat<T> { }

export interface TemporalDataFormat<T> extends DataFormat<T> {
    extractTimestamp(dataPoint: T): Date;
    sortKey(dataPoint: T): any;
    combineDataSets(sets: TemporalData<T>[]): TemporalData<T>;
}

export var ohlcvDataFormat = {
    extractTimestamp: function (dataPoint: Candle) {
        return dataPoint.start;
    },
    sortKey: function (dataPoint: Candle) {
        return dataPoint.start;
    },
    uniqueKey: function (dataPoint: Candle) {
        return dataPoint.start.getTime();
    },
    combineDataSets: function (sets: TemporalData<Candle>[]) {
        if (sets.length === 1)
            return sets[0];
        var allDataPoints: Candle[] = _.flatten(_.map(sets, s => s.data), true);
        var data = _.sortBy(_.uniq(allDataPoints, this.uniqueKey), this.sortKey);
        return new TemporalData<Candle>(data);
    },
};

export var tradesDataFormat = {
    extractTimestamp: function (dataPoint: Trade) {
        return dataPoint.timestamp;
    },
    sortKey: function (dataPoint: Trade) {
        return dataPoint.timestamp;
    },
    uniqueKey: function (dataPoint: Trade) {
        return dataPoint.id_from_exchange ||
            "" + dataPoint.timestamp.getTime() + dataPoint.flags + dataPoint.price + dataPoint.amount;
    },
    combineDataSets: function (sets: TemporalData<Trade>[]) {
        var allDataPoints: Trade[] = _.flatten(_.map(sets, s => s.data), true);
        var data = _.sortBy(_.uniq(allDataPoints, this.uniqueKey), this.sortKey);
        return new TemporalData<Trade>(data);
    },
};
