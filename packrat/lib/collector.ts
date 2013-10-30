import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import database = require("./database");
import markets = require("./markets");
import Flugelserver = require("./server");


// TODO: be resilient to errors


class Collector {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private exchangeName: string,
                private db: database.Database, private server: Flugelserver) { }

    public streamTicker(ticker: Ticker) {
        var market = markets.get(this.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (!(latest && latest.equivalent(ticker))) {
            this.latestTickers[market.id] = ticker;

            this.server.broadcast("ticker:" + market.id, {
                timestamp: ticker.timestamp.getTime() / 1000,
                last: ticker.last,
                bid: ticker.bid,
                ask: ticker.ask,
            });
        }
    }

    public storeTicker(ticker: Ticker) {
        var market = markets.get(this.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        this.db.insert_ticker(market.id, ticker);
    }

    public streamTrade(trade: Trade) {
        var market = markets.get(this.exchangeName, trade.left, trade.right);
        if (!market)
            return;

        this.server.broadcast("trades:" + market.id, {
            trades: [{
                timestamp: trade.timestamp.getTime() / 1000,
                flags: trade.flags,
                price: trade.price,
                amount: trade.amount,
                id_from_exchange: trade.id_from_exchange,
            }],
        });
    }

    public storeTrade(trade: Trade) {
        var market = markets.get(this.exchangeName, trade.left, trade.right);
        if (!market)
            return;

        this.db.get_trade_by_id_from_exchange(market.id, trade.id_from_exchange, (err: any, existingTrade) => {
            if (err)
                throw err;
            if (!existingTrade)
                this.db.insert_trade(market.id, trade);
        });
    }
}

export = Collector;
