import _ = require("lodash");

import Order = require("./order");


class OrderBook {
    public bids: Order[];
    public asks: Order[];

    constructor(bids: Order[], asks: Order[]) {
        this.bids = bids;
        this.asks = asks;
    }

    public static fromSortedOrders(orders: Order[]) {
        var sides = _.groupBy(orders, o => o.flags & Order.SIDE_MASK);
        var bids = sides[Order.BID];
        var asks = sides[Order.ASK];
        bids.reverse();
        return new this(bids, asks);
    }
}

export = OrderBook;
