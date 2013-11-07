import _ = require("underscore");
import pg = require("pg");
import Promise = require("bluebird");

import sql = require("../../lib/sql");
import Candle = require("../../lib/models/candle");
import Order = require("../../lib/models/order");
import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");


export function connect(url: string) {
    var db = new pg.Client(url);
    return Promise.promisify(db.connect, db)().then(() => new Database(db));
}


export class Database {
    private query: (query: string, params: any[]) => Promise<any>;

    constructor(private db: any) {
        this.query = Promise.promisify(db.query, db);
    }

    public get_trade_by_id_from_exchange(market_id: number, id_from_exchange: string) {
        return this.query("SELECT * FROM trade WHERE market_id = $1 AND id_from_exchange = $2",
                [market_id, id_from_exchange])
            .then(result => result.rows[0]);
    }

    public get_most_recent_trade(market_id: number) {
        return this.query("SELECT * FROM trade WHERE market_id = $1" +
                " ORDER BY timestamp DESC, id DESC LIMIT 1", [market_id])
            .then(result => result.rows[0]);
    }

    public stream_trades_starting_at(market_id: number, start: Date,
            error: (err: any) => void, row: (row: Trade) => void, end?: (result: any) => void) {
        var query = this.db.query("SELECT * FROM trade" +
            " WHERE market_id = $1 AND timestamp >= $2 ORDER BY timestamp, id", [market_id, start]);
        if (error)
            query.on("error", error);
        if (row)
            query.on("row", row);
        if (end)
            query.on("end", end);
    }

    public stream_trades_from_to(market_id: number, start: Date, endDate: Date,
            error: (err: any) => void, row: (row: Trade) => void, end?: (result: any) => void) {
        var query = this.db.query("SELECT * FROM trade" +
                " WHERE market_id = $1 AND timestamp >= $2 AND timestamp < $3 ORDER BY timestamp, id",
            [market_id, start, endDate]);
        if (error)
            query.on("error", error);
        if (row)
            query.on("row", row);
        if (end)
            query.on("end", end);
    }

    public get_latest_candle(market_id: number, timespan: number) {
        return this.query("SELECT start FROM candle" +
                " WHERE market_id = $1 AND timespan = $2" +
                " ORDER BY start DESC", [market_id, timespan])
            .then(result => result.rows[0]);
    }

    public get_latest_depth_snapshot_timestamp(market_id: number) {
        return this.query("SELECT timestamp FROM depthsnapshotorder" +
                " WHERE market_id = $1" +
                " ORDER BY timestamp DESC LIMIT 1", [market_id])
            .then(result => result.rows.length ? result.rows[0].timestamp : undefined);
    }

    public get_depth_snapshot_orders_at_timestamp(market_id: number, timestamp: Date) {
        return this.query("SELECT * FROM depthsnapshotorder" +
                " WHERE market_id = $1 AND timestamp = $2" +
                " ORDER BY price", [market_id, timestamp])
            .then(result => result.rows);
    }

    public insert_ticker(market_id: number, ticker: Ticker) {
        return this.query("INSERT INTO ticker" +
                " (market_id, timestamp, last, bid, ask) VALUES ($1, $2, $3, $4, $5)",
            [market_id, ticker.timestamp, ticker.last, ticker.bid, ticker.ask]);
    }

    public insert_trade(market_id: number, trade: Trade) {
        return this.query("INSERT INTO trade" +
                " (market_id, timestamp, flags, price, amount, id_from_exchange)" +
                " VALUES ($1, $2, $3, $4, $5, $6)",
            [market_id, trade.timestamp, trade.flags, trade.price, trade.amount, trade.id_from_exchange]);
    }

    public insert_order(market_id: number, order: Order, timestamp: Date, flags: number) {
        return this.query("INSERT INTO depthsnapshotorder" +
                " (market_id, timestamp, flags, price, amount)" +
                " VALUES ($1, $2, $3, $4, $5)",
            [market_id, timestamp, flags, order.price, order.amount]);
    }

    public delete_depth_snapshots_before_timestamp(market_id: number, timestamp: Date) {
        return this.query("DELETE FROM depthsnapshotorder WHERE market_id = $1 AND timestamp < $2",
            [market_id, timestamp]);
    }

    public upsert_candle(market_id: number, candle: Candle) {
        return sql.upsert(this.db, "candle",
            {market_id: market_id, timespan: candle.timespan, start: candle.start},
            _.pick(candle, "open", "close", "low", "high", "volume", "vwap", "count",
                "buy_open", "sell_open", "buy_close", "sell_close", "buy_low", "sell_low", "buy_high", "sell_high",
                "buy_volume", "sell_volume", "buy_vwap", "sell_vwap", "buy_count", "sell_count"));
    }
}
