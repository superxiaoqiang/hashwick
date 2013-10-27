import _ = require("underscore");

import CandleBuilder = require("../../lib/calc/candleBuilder");
import sql = require("../../lib/sql");
import Candle = require("../../lib/models/candle");
import markets_ = require("./markets");
if (0) markets_;
import Market = markets_.Market;


export function buildCandles(db: any, market: Market, timespan: number) {
    db.query("SELECT start FROM candle" +
        " WHERE market_id = $1 AND timespan = $2 ORDER BY start DESC",
        [market.id, timespan], (err: any, result: any) => {
            if (err)
                throw err;

            var builder = new CandleBuilder(timespan);

            var start = result.rows.length ? result.rows[0].start : new Date(0);
            var query = db.query("SELECT * FROM trade" +
                " WHERE market_id = $1 AND timestamp >= $2", [market.id, start]);
            query.on("error", (err: any) => {
                throw err;
            });
            query.on("row", builder.sendTrade.bind(builder));

            builder.onCandle = (candle: Candle) => {
                sql.upsert(db, "candle",
                    {market_id: market.id, timespan: candle.timespan, start: candle.start},
                    _.pick(candle, "open", "close", "low", "high", "volume", "vwap", "count",
                        "buy_open", "sell_open", "buy_close", "sell_close", "buy_low", "sell_low", "buy_high", "sell_high",
                        "buy_volume", "sell_volume", "buy_vwap", "sell_vwap", "buy_count", "sell_count"));
            };
    });
}
