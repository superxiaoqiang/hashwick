import _ = require("underscore");

import Logger = require("../../lib/logger");
import CandleBuilder = require("../../lib/calc/candleBuilder");
import Candle = require("../../lib/models/candle");
import Market = require("../../lib/models/market");
import database_ = require("./database");
if (0) database_;
import Database = database_.Database;


var log = new Logger("packrat.lib.aggregate");


export function buildCandles(db: Database, market: Market, timespan: number) {
    log.info(market.describe() + " " + timespan / 60 + "-minute candles - building");
    db.get_latest_candle(market.id, timespan).then(candle => {
        var builder = new CandleBuilder(timespan);
        var totalCandles = 0;
        builder.onCandle = (candle: Candle) => {
            ++totalCandles;
            db.upsert_candle(market.id, candle).done();
        };

        var start = candle ? candle.start : new Date(0);
        db.stream_trades_starting_at(market.id, start,
            (err: any) => { throw err; },
            builder.feedTrade.bind(builder),
            result => {
                log.info(market.describe() + " " + timespan / 60 + "-minute candles - built " +
                    totalCandles + " candles");
            });
    }).done();
}


export function cleanOldDepth(db: Database, market: Market) {
    log.info(market.describe() + " - cleaning old depth");
    db.get_latest_depth_snapshot_timestamp(market.id).then(timestamp => {
        if (!timestamp)
            return;
        db.delete_depth_snapshots_before_timestamp(market.id, timestamp).then(result => {
            log.info(market.describe() + " - cleaned old depth, deleted " + result.rowCount + " rows");
        }).done();
    }).done();
}
