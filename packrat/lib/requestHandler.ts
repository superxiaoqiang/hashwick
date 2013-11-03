import _ = require("underscore");

import Order = require("../../lib/models/order");
import database = require("./database");
import Flugelserver = require("./server");


class RequestHandler {
    constructor(private db: database.Database, private server: Flugelserver) {
        server.bind("getTicker", this.getTicker.bind(this));
        server.bind("getTrades", this.getTrades.bind(this));
        server.bind("getDepth", this.getDepth.bind(this));
    }

    private getTicker(socket: any, data: any) {
        console.log(JSON.stringify(data));
    }

    private getTrades(socket: any, data: any) {
        var pending: any[] = [];
        var flush = () => {
            this.server.sendToOne(socket, "trades:" + data.marketID, {trades: pending});
            pending = [];
        };

        this.db.stream_trades_from_to(parseInt(data.marketID),
            new Date(data.earliest * 1000), new Date(data.latest * 1000),
            err => { throw err; },
            trade => {
                pending.push({
                    timestamp: trade.timestamp.getTime() / 1000,
                    flags: trade.flags,
                    price: trade.price,
                    amount: trade.amount,
                    id_from_exchange: trade.id_from_exchange,
                });
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

            var sides = _.groupBy(orders, o => o.flags & Order.SIDE_MASK);
            var bids = sides[Order.BID];
            var asks = sides[Order.ASK];
            bids.reverse();

            function serializeOrder(order: Order) {
                return {price: order.price, amount: order.amount};
            }

            this.server.sendToOne(socket, "depth:" + data.marketID, {
                bids: _.map(bids, serializeOrder),
                asks: _.map(asks, serializeOrder),
            });
        });
    }
}

export = RequestHandler;
