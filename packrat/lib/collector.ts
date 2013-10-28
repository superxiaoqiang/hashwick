import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import database = require("./database");
import markets = require("./markets");
import Flugelserver = require("./server");
import Watcher = require("./watchers/watcher");


// TODO: be resilient to errors


class Collector {
    private latestTickers: { [marketID: number]: Ticker; } = {};

    constructor(private watcher: Watcher, private db: database.Database, private server: Flugelserver) { }

    public start() {
        this.watcher.onTicker.attach(this.ticker.bind(this));
        this.watcher.onTrade.attach(this.trade.bind(this));
    }

    private ticker(ticker: Ticker) {
        var market = markets.get(this.watcher.exchangeName, ticker.left, ticker.right);
        if (!market)
            return;

        var latest = this.latestTickers[market.id];
        if (latest && latest.equivalent(ticker))
            return;

        this.latestTickers[market.id] = ticker;

        this.server.broadcast("ticker:" + market.id, {
            timestamp: ticker.timestamp.getTime() / 1000,
            last: ticker.last,
            bid: ticker.bid,
            ask: ticker.ask,
        });

        this.db.insert_ticker(market.id, ticker);
    }

    private trade(trade: Trade) {
        var market = markets.get(this.watcher.exchangeName, trade.left, trade.right);
        if (!market)
            return;

        this.db.get_trade_by_id_from_exchange(market.id, trade.id_from_exchange, (err: any, existingTrade) => {
            if (err)
                throw err;
            if (existingTrade)
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

            this.db.insert_trade(market.id, trade);
        });
    }
}

export = Collector;
