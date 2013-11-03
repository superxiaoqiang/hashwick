import Order = require("./order");


class OrderBook {
    public bids: Order[];
    public asks: Order[];

    constructor(bids: Order[], asks: Order[]) {
        this.bids = bids;
        this.asks = asks;
    }
}

export = OrderBook;
