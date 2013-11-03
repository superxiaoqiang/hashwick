import _ = require("underscore");

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

export function serializeOrderBook(orderBook: OrderBook) {
    function serializeOrder(order: Order) {
        return {price: order.price, amount: order.amount};
    }

    return {
        bids: _.map(orderBook.bids, serializeOrder),
        asks: _.map(orderBook.asks, serializeOrder),
    };
}
