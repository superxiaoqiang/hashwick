import promise = require("../utils/promise");
import formats_ = require("./formats");
if (0) formats_;
import SnapshotDataFormat = formats_.SnapshotDataFormat;
import TemporalDataFormat = formats_.TemporalDataFormat;
import interfaces_ = require("./interfaces");
if (0) interfaces_;
import SnapshotDataSource = interfaces_.SnapshotDataSource;
import TemporalDataSource = interfaces_.TemporalDataSource;
import models_ = require("./models");
if (0) models_;
import SnapshotData = models_.SnapshotData;
import TemporalData = models_.TemporalData;


export class SnapshotDataStack<T> extends SnapshotDataSource<T> {
    private infos: SnapshotDataStackSourceInfo<T>[] = [];

    constructor(format: SnapshotDataFormat<T>) {
        super();
        this.format = format;
    }

    public addSource(info: SnapshotDataStackSourceInfo<T>) {
        this.infos.push(info);
        info.source.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        _.each(this.infos, info => {
            info.source.wantRealtime();
        });
    }

    public unwantRealtime() {
        _.each(this.infos, info => {
            info.source.unwantRealtime();
        });
    }

    public getFromMemory(): SnapshotData<T> {
        return _.reduce(this.infos, (result, info) => {
            var candidate = info.source.getFromMemory();
            return !result ? candidate :
                !candidate ? result :
                candidate.timestamp > result.timestamp ? candidate : result;
        }, undefined);
    }

    public prefetch() {
        var ret = $.Deferred();
        _.each(this.infos, info => {
            info.source.prefetch().then(ret.resolve);
        });
        return ret;
    }
}

export interface SnapshotDataStackSourceInfo<T> {
    source: SnapshotDataSource<T>;
}


export class TemporalDataStack<T> extends TemporalDataSource<T> {
    private infos: TemporalDataStackSourceInfo<T>[] = [];

    constructor(format: TemporalDataFormat<T>) {
        super();
        this.format = format;
    }

    public addSource(info: TemporalDataStackSourceInfo<T>) {
        this.infos.push(info);
        info.source.gotData.attach(this.gotData.emit.bind(this.gotData));
    }

    public wantRealtime() {
        _.each(this.infos, info => {
            info.source.wantRealtime();
        });
    }

    public unwantRealtime() {
        _.each(this.infos, info => {
            info.source.unwantRealtime();
        });
    }

    private getLatestTimestampFromSources(infos: TemporalDataStackSourceInfo<T>[], ...args: any[]) {
        return _.reduce(infos, (acc, info) => {
            var result = info.source.getFromMemory.apply(info.source, args);
            var candidate = result.data.length
                ? info.source.format.extractTimestamp(result.data[result.data.length - 1])
                : undefined;
            return !acc ? candidate : !candidate ? acc : candidate > acc ? candidate : acc;
        }, undefined);
    }

    private getLatestTimestampFromDataSets(sets: TemporalData<T>[], earliest: Date) {
        return _.reduce(sets, (acc, set) => {
            var candidate = set.data.length ? this.format.extractTimestamp(set.data[set.data.length - 1]) : undefined;
            return !acc ? candidate : !candidate ? acc : candidate > acc ? candidate : acc;
        }, earliest);
    }

    public getFromMemory(earliest: Date, latest: Date, ...args: any[]) {
        var getter = (info: TemporalDataStackSourceInfo<T>) => {
            return info.source.getFromMemory.apply(info.source, [earliest, latest].concat(args));
        };

        var sets = _.map(_.where(this.infos, {role: "historical"}), getter);
        var historicalLatest = this.getLatestTimestampFromDataSets(sets, earliest);
        earliest = historicalLatest || earliest;
        sets = sets
            .concat(_.map(_.where(this.infos, {role: "partial"}), getter))
            .concat(_.map(_.where(this.infos, {role: "realtime"}), getter));
        return this.format.combineDataSets(sets);
    }

    public prefetch(earliest: Date, latest: Date, ...args: any[]) {
        var prefetcher = (info: TemporalDataStackSourceInfo<T>) => {
            return info.source.prefetch.apply(info.source, [earliest, latest].concat(args));
        };

        return promise.tolerantWhen<void>(_.map(_.where(this.infos, {role: "historical"}), prefetcher))
            .then<void>(() => {
                var historicalLatest = this.getLatestTimestampFromSources(
                    _.where(this.infos, {role: "historical"}), earliest, latest);
                earliest = historicalLatest || earliest;
                // TODO: omit realtime from prefetch after fixing flugelhorn!
                var theRest = _.where(this.infos, {role: "partial"}).concat(_.where(this.infos, {role: "realtime"}));
                return promise.tolerantWhen<void>(_.map(theRest, prefetcher));
            });
    }
}

export interface TemporalDataStackSourceInfo<T> {
    source: TemporalDataSource<T>;
    role: string;
}
