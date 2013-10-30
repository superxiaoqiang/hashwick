import database = require("./database");
import Flugelserver = require("./server");


class RequestHandler {
    constructor(private db: database.Database, private server: Flugelserver) {
        server.bind("getTicker", this.getTicker.bind(this));
        server.bind("getTrades", this.getTrades.bind(this));
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
}

export = RequestHandler;
