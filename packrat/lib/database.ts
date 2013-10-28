import _ = require("underscore");
import pg = require("pg");

import date = require("../../lib/date");
import sql = require("../../lib/sql");
import Candle = require("../../lib/models/candle");
import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");


export interface Callback<T> {
    (err: any, result: T): void;
}


export function connect(url: string, callback: Callback<Database>) {
    var db = new pg.Client(url);
    db.connect((err: any) => {
        callback(err, err ? undefined : new Database(db));
    });
}


export class Database {
    constructor(private db: any) { }

    public get_trade_by_id_from_exchange(market_id: number, id_from_exchange: string, callback: Callback<Trade>) {
        this.db.query("SELECT * FROM trade WHERE market_id = $1 AND id_from_exchange = $2",
                [market_id, id_from_exchange], (err: any, result: any) => {
            callback(err, err ? undefined : result.rows[0]);
        });
    }

    public stream_trades_starting_at(market_id: number, start: Date,
            error: (err: any) => void, row: (row: Trade) => void, end?: (result: any) => void) {
        var query = this.db.query("SELECT * FROM trade" +
            " WHERE market_id = $1 AND timestamp >= $2", [market_id, start]);
        if (error)
            query.on("error", error);
        if (row)
            query.on("row", row);
        if (end)
            query.on("end", end);
    }

    public get_latest_candle(market_id: number, timespan: number, callback: Callback<Candle>) {
        this.db.query("SELECT start FROM candle WHERE market_id = $1 AND timespan = $2 ORDER BY start DESC",
                [market_id, timespan], (err: any, result: any) => {
            callback(err, err ? undefined : result.rows[0]);
        });
    }

    public insert_ticker(market_id: number, ticker: Ticker) {
        this.db.query("INSERT INTO ticker" +
                " (market_id, timestamp, last, bid, ask) VALUES ($1, $2, $3, $4, $5)",
            [market_id, date.toFakeUTC(ticker.timestamp), ticker.last, ticker.bid, ticker.ask]);
    }

    public insert_trade(market_id: number, trade: Trade) {
        this.db.query("INSERT INTO trade" +
                " (market_id, timestamp, flags, price, amount, id_from_exchange)" +
                " VALUES ($1, $2, $3, $4, $5, $6)",
            [market_id, date.toFakeUTC(trade.timestamp), trade.flags,
                trade.price, trade.amount, trade.id_from_exchange]);
    }

    public upsert_candle(market_id: number, candle: Candle) {
        sql.upsert(this.db, "candle",
            {market_id: market_id, timespan: candle.timespan, start: date.toFakeUTC(candle.start)},
            _.pick(candle, "open", "close", "low", "high", "volume", "vwap", "count",
                "buy_open", "sell_open", "buy_close", "sell_close", "buy_low", "sell_low", "buy_high", "sell_high",
                "buy_volume", "sell_volume", "buy_vwap", "sell_vwap", "buy_count", "sell_count"));
    }
}
