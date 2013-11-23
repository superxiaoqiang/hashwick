import _ = require("underscore");

import Candle = require("./models/candle");
import Order = require("./models/order");
import OrderBook = require("./models/orderBook");
import Ticker = require("./models/ticker");
import Trade = require("./models/trade");


export function serializeTicker(ticker: Ticker) {
    return {
        timestamp: ticker.timestamp.getTime() / 1000,
        last: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
    };
}

export function serializeTrade(trade: Trade) {
    return {
        timestamp: trade.timestamp.getTime() / 1000,
        flags: trade.flags,
        price: trade.price,
        amount: trade.amount,
        id_from_exchange: trade.id_from_exchange,
    };
}

export function serializeCandle(c: Candle) {
    return {
        start: c.start.getTime() / 1000,
        timespan: c.timespan,

        open: c.open && c.open.toString(),
        close: c.close && c.close.toString(),
        low: c.low && c.low.toString(),
        high: c.high && c.high.toString(),
        volume: c.volume && c.volume.toString(),
        vwap: c.vwap && c.vwap.toString(),
        count: c.count,

        buy_open: c.buy_open && c.buy_open.toString(),
        buy_close: c.buy_close && c.buy_close.toString(),
        buy_low: c.buy_low && c.buy_low.toString(),
        buy_high: c.buy_high && c.buy_high.toString(),
        buy_volume: c.buy_volume && c.buy_volume.toString(),
        buy_vwap: c.buy_vwap && c.buy_vwap.toString(),
        buy_count: c.buy_count,

        sell_open: c.sell_open && c.sell_open.toString(),
        sell_close: c.sell_close && c.sell_close.toString(),
        sell_low: c.sell_low && c.sell_low.toString(),
        sell_high: c.sell_high && c.sell_high.toString(),
        sell_volume: c.sell_volume && c.sell_volume.toString(),
        sell_vwap: c.sell_vwap && c.sell_vwap.toString(),
        sell_count: c.sell_count,
    };
}

export function serializeOrderBook(orderBook: OrderBook) {
    function serializeOrder(order: Order) {
        return {price: order.price, amount: order.amount};
    }

    return {
        bids: _.map(orderBook.bids, serializeOrder),
        asks: _.map(orderBook.asks, serializeOrder),
    };
}
