import _ = require("underscore");

import serializers = require("../../lib/serializers");
import Order = require("../../lib/models/order");
import OrderBook = require("../../lib/models/orderBook");
import database = require("./database");
import Flugelserver = require("./server");


class RequestHandler {
    constructor(private db: database.Database, private server: Flugelserver) {
        server.bind("getTicker", this.getTicker.bind(this));
        server.bind("getTrades", this.getTrades.bind(this));
        server.bind("getDepth", this.getDepth.bind(this));
    }

    private getTicker(socket: any, data: any) {
        this.db.get_most_recent_ticker(data.marketID).then(ticker => {
            if (ticker)
                this.server.sendToOne(socket, "ticker:" + data.marketID,
                    serializers.serializeTicker(ticker));
        });
    }

    private getTrades(socket: any, data: any) {
        var pending: any[] = [];
        var flush = () => {
            this.server.sendToOne(socket, "getTrades:" + data.marketID, {trades: pending});
            pending = [];
        };

        this.db.stream_trades_from_to(parseInt(data.marketID),
            new Date(data.earliest * 1000), new Date(data.latest * 1000),
            err => { throw err; },
            trade => {
                pending.push(serializers.serializeTrade(trade));
                if (pending.length >= 500)
                    flush();
            },
            result => { flush(); }
        );
    }

    private getDepth(socket: any, data: any) {
        this.db.get_latest_depth_snapshot_timestamp(data.marketID).then(timestamp => {
            if (!timestamp)
                return;
            return this.db.get_depth_snapshot_orders_at_timestamp(data.marketID, timestamp);
        }).then((orders: Order[]) => {
            if (!orders)
                return;
            var book = OrderBook.fromSortedOrders(orders);
            this.server.sendToOne(socket, "depth:" + data.marketID, serializers.serializeOrderBook(book));
        });
    }
}

export = RequestHandler;
