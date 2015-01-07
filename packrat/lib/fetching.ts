import _ = require("lodash");
import Promise = require("bluebird");

import Logger = require("../../lib/logger");
import serializers = require("../../lib/serializers");
import Market = require("../../lib/models/market");
import Order = require("../../lib/models/order");
import OrderBook = require("../../lib/models/orderBook");
import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");
import database = require("./database");
import Flugelserver = require("./server");


var log = new Logger("packrat.lib.fetching");


export interface TradesFetcher {
    (left: string, right: string, since: Date): Promise<Trade[]>;
}

export function fetchTrades(db: database.Database, server: Flugelserver, market: Market, fetchTrades: TradesFetcher) {
    function fetch(since: Date) {
        return fetchTrades(market.left, market.right, since);
    }
    return fetchTradesAbstract(fetch, "trade", db, server, market);
}

export interface LendsFetcher {
    (asset: string, since: Date): Promise<Trade[]>;
}

export function fetchLends(db: database.Database, server: Flugelserver, market: Market, fetchLends: LendsFetcher) {
    function fetch(since: Date) {
        return fetchLends(market.left, since);
    }
    return fetchTradesAbstract(fetch, "lend", db, server, market);
}

function fetchTradesAbstract(fetcher: Function, logText: string,
                             db: database.Database, server: Flugelserver, market: Market) {
    var numTrades: number;
    return db.get_most_recent_trade(market.id).then((mostRecentTrade: Trade) => {
        var since = getTradesFetchStart(market, mostRecentTrade);
        log.debug(market.describe() + " - fetching " + logText + "s since " + since.toISOString());
        return fetcher(since);
    }).then((trades: Trade[]) => {
        if (trades.length) {
            var diff = trades[trades.length - 1].timestamp.getTime() - new Date().getTime();
            if (diff > 0)
                log.info(market.describe() + " - last received " + logText + " is " +
                    diff / 1000 + " sec in the future");
        }

        numTrades = trades.length;
        return filterTradesToUnseen(db, market, trades);
    }).then((trades: Trade[]): any => {
        var message = market.describe() + " - received " + numTrades + " " + logText + "s, " +
            trades.length + " of which are new";
        if (trades.length)
            message += ", from " + trades[0].timestamp.toISOString() + " to " +
                trades[trades.length - 1].timestamp.toISOString();
        log.debug(message);

        streamTrades(server, market, trades);
        _.each(trades, trade => {
            db.insert_trade(market.id, trade).done();
        });
    }, (err: any) => {
        log.error(market.describe() + " - error fetching " + logText + "s: " + err);
    });
}

function getTradesFetchStart(market: Market, mostRecentTrade: Trade) {
    var maxGap = 60 * 60 * 1000;
    if (mostRecentTrade) {
        if (Date.now() - mostRecentTrade.timestamp.getTime() > maxGap)
            log.attentionRequired(market.describe() +
                " - no trades stored since " + mostRecentTrade.timestamp.toISOString() +
                ", you may need to check what's up");
        else
            return mostRecentTrade.timestamp;
    }
    return new Date(Date.now() - maxGap);
}

function filterTradesToUnseen(db: database.Database, market: Market, trades: Trade[]) {
    return Promise.map(trades, findStoredMatchingTrade.bind(this, db, market))
        .map((matchingTrade, index) => matchingTrade ? null : trades[index])
        .filter(trade => trade);
}

function findStoredMatchingTrade(db: database.Database, market: Market, trade: Trade) {
    // the easy case
    if (trade.id_from_exchange)
        return db.get_trade_by_id_from_exchange(market.id, trade.id_from_exchange);

    // the annoying and imprecise case (thanks, bitfinex)
    return new Promise((resolve, reject) => {
        var match: Trade;
        db.stream_trades_from_to(market.id,
            trade.timestamp, new Date(trade.timestamp.getTime() + 1000),
            (err: any) => { reject(); },
            (row: Trade) => {
                if (trade.timestamp.getTime() === row.timestamp.getTime() &&
                    parseFloat(trade.price) === parseFloat(row.price) &&
                    parseFloat(trade.amount) === parseFloat(row.amount))
                    match = row;
            },
            (result: any) => {
                resolve(match);
            });
    });
}


export interface OrderBookFetcher {
    (left: string, right: string): Promise<OrderBook>;
}

export function fetchDepth(db: database.Database, server: Flugelserver, market: Market, fetchOrderBook: OrderBookFetcher) {
    log.debug(market.describe() + " - fetching depth");
    return fetchOrderBook(market.left, market.right).then(orderBook => {
        log.debug(market.describe() + " - got depth, " + orderBook.bids.length +
            " bids, " + orderBook.asks.length + " asks");
        streamOrderBook(server, market, orderBook);
        storeOrderBook(db, market, orderBook, new Date());
    }, err => {
        log.error(market.describe() + " - error fetching depth: " + err);
    });
}

export interface LendBookFetcher {
    (asset: string): Promise<OrderBook>;
}

export function fetchLendBook(db: database.Database, server: Flugelserver, market: Market, fetchLendBook: LendBookFetcher) {
    log.debug(market.describe() + " - fetching lendbook");
    return fetchLendBook(market.left).then(lendBook => {
        log.debug(market.describe() + " - got lendbook, " + lendBook.bids.length +
            " bids, " + lendBook.asks.length + " asks");
        streamOrderBook(server, market, lendBook);
        storeOrderBook(db, market, lendBook, new Date());
    }, err => {
        log.error(market.describe() + " - error fetching lendbook: " + err);
    });
}


function storeOrderBook(db: database.Database, market: Market, orderBook: OrderBook, timestamp: Date) {
    _.each(orderBook.bids, storeOrder.bind(this, Order.BID));
    _.each(orderBook.asks, storeOrder.bind(this, Order.ASK));

    function storeOrder(flags: number, order: Order) {
        db.insert_order(market.id, order, timestamp, flags).done();
    }
}

function streamTrades(server: Flugelserver, market: Market, trades: Trade[]) {
    if (!trades.length)
        return;
    var ts = _.map(trades, serializers.serializeTrade);
    server.broadcast("trades:" + market.id, {trades: ts});
}

function streamOrderBook(server: Flugelserver, market: Market, orderBook: OrderBook) {
    server.broadcast("depth:" + market.id, serializers.serializeOrderBook(orderBook));
}
