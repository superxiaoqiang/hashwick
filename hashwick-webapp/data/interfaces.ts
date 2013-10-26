import Signal = require("../../lib/signal");
import time = require("../utils/time");
import context_ = require("./context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import formats = require("./formats");
import models = require("./models");


export interface DataSourceClass {
    deserialize(context: DeserializationContext, structure: SerializedDataSource): DataSource;
}

export class DataSource {
    public format: formats.DataFormat<any>;
    public gotData = new Signal();

    constructor() { }  // this is here to workaround compiler bug

    serialize(context: SerializationContext): SerializedDataSource { throw 0; }
    description(): string { throw 0; }
    wantRealtime() { }
    unwantRealtime() { }
}

export interface SerializedDataSource {
    type: string;
}


export class SnapshotDataSource<T> extends DataSource {
    public format: formats.SnapshotDataFormat<T>;

    public isUpToDate(timeout: number) {
        var data = this.getFromMemory();
        return data && time.serverNow().getTime() - data.timestamp.getTime() < timeout * 1000;
    }

    public getFromMemory(): models.SnapshotData<T> {
        throw 0;
    }

    public prefetch(): JQueryGenericPromise<void> {
        return $.Deferred().resolve();
    }
}


export class TemporalDataSource<T> extends DataSource {
    public format: formats.TemporalDataFormat<T>;

    public getFromMemory(earliest: Date, latest: Date): models.TemporalData<T> {
        throw 0;
    }

    public prefetch(earliest: Date, latest: Date): JQueryGenericPromise<void> {
        return $.Deferred().resolve();
    }
}


export class LiveTickerDataSource extends SnapshotDataSource<models.Ticker> {
    public format = {};
}

export class LiveDepthDataSource extends SnapshotDataSource<models.DepthData> {
    public format = {};
}

export class LivePortfolioDataSource extends SnapshotDataSource<models.Portfolio> {
    public format = {};
}

export class TradesDataSource extends TemporalDataSource<models.Trade> {
    public format = formats.tradesDataFormat;
}

export class OHLCVDataSource extends TemporalDataSource<models.Candle> {
    public format = formats.ohlcvDataFormat;
    public period: number;
}
