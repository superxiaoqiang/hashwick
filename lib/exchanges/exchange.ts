import OrderBook = require("../models/orderBook");
import Ticker = require("../models/ticker");
import Trade = require("../models/trade");


class Exchange {
    public fetchTicker(left: string, right: string): Promise<Ticker> { throw 0; }

    public fetchTrades(left: string, right: string, since: Date): Promise<any[]> { throw 0; }

    public fetchOrderBook(left: string, right: string): Promise<OrderBook> { throw 0; }
}

export = Exchange;
