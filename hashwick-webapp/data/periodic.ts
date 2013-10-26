import DeferredTimer = require("../utils/deferredTimer");
if (0) DeferredTimer;
import time = require("../utils/time");
import interfaces_ = require("./interfaces");
if (0) interfaces_;
import SnapshotDataSource = interfaces_.SnapshotDataSource;
import TemporalDataSource = interfaces_.TemporalDataSource;


export class PeriodicSnapshotDataFetcher extends DeferredTimer {
    private dataSource: SnapshotDataSource<any>;

    constructor(interval: number, dataSource: SnapshotDataSource<any>) {
        super(interval);
        this.dataSource = dataSource;
    }

    public tick() {
        return this.dataSource.prefetch();
    }
}


export class PeriodicTemporalDataFetcher extends DeferredTimer {
    private dataSource: TemporalDataSource<any>;
    private timespan: number;

    constructor(interval: number, dataSource: TemporalDataSource<any>, timespan: number) {
        super(interval);
        this.dataSource = dataSource;
        this.timespan = timespan;
    }

    public tick() {
        var latest = time.serverNow();
        var earliest = new Date(latest.getTime() - this.timespan * 1000);
        return this.dataSource.prefetch(earliest, latest);
    }
}
