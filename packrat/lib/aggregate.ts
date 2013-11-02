import _ = require("underscore");

import CandleBuilder = require("../../lib/calc/candleBuilder");
import Candle = require("../../lib/models/candle");
import Market = require("../../lib/models/market");
import database_ = require("./database");
if (0) database_;
import Database = database_.Database;


export function buildCandles(db: Database, market: Market, timespan: number) {
    db.get_latest_candle(market.id, timespan).then(candle => {
        var builder = new CandleBuilder(timespan);

        var start = candle ? candle.start : new Date(0);
        db.stream_trades_starting_at(market.id, start,
            (err: any) => { throw err; },
            builder.feedTrade.bind(builder)
        );

        builder.onCandle = (candle: Candle) => {
            db.upsert_candle(market.id, candle).done();
        };
    }).done();
}
