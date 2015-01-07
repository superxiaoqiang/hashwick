/// <reference path="../vendor/bluebird/bluebird.d.ts" />
/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/lodash/lodash.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("lodash");

import Logger = require("../lib/logger");
import Bitfinex = require("../lib/exchanges/bitfinex");
import Bitstamp = require("../lib/exchanges/bitstamp");
import BTCE = require("../lib/exchanges/btce");
import MtGox = require("../lib/exchanges/mtgox");
import PromiseScheduler = require("../lib/promiseScheduler");
import config = require("./config");
import aggregate = require("./lib/aggregate");
import bookkeeper_ = require("./lib/bookkeeper");
if (0) bookkeeper_;
import Bookkeeper = bookkeeper_.Bookkeeper;
import fetching = require("./lib/fetching");
import database = require("./lib/database");
import markets = require("./lib/markets");
import RequestHandler = require("./lib/requestHandler");
import Flugelserver = require("./lib/server");


var logger = new Logger("packrat.daemon");
logger.info("starting");


var server = new Flugelserver(config.websocketPort);


database.connect(config.database).then(db => {
    setupBookkeeper(db, server);
    setupPeriodicJobs(db);
    new RequestHandler(db, server);
    logger.info("started");
}).done();



function setupBookkeeper(db: database.Database, server: Flugelserver) {
    var bookkeeper = new Bookkeeper(db, server);

    var mtgoxScheduler = new PromiseScheduler(2 * 1000);
    var mtgox = new MtGox();
    var mtgoxBTCUSD = markets.get("mtgox", "BTC", "USD");
    mtgoxScheduler.schedule(bookkeeper.fetchTicker.bind(bookkeeper, mtgox, mtgoxBTCUSD), 3 * 1000);
    mtgoxScheduler.schedule(bookkeeper.fetchTrades.bind(bookkeeper, mtgox, mtgoxBTCUSD), 2 * 1000);
    mtgoxScheduler.schedule(bookkeeper.fetchDepth.bind(bookkeeper, mtgox, mtgoxBTCUSD), 5 * 1000);

    var btceScheduler = new PromiseScheduler(2 * 1000);
    var btce = new BTCE();
    var btceBTCUSD = markets.get("btce", "BTC", "USD");
    btceScheduler.schedule(bookkeeper.fetchTicker.bind(bookkeeper, btce, btceBTCUSD), 3 * 1000);
    btceScheduler.schedule(bookkeeper.fetchTrades.bind(bookkeeper, btce, btceBTCUSD), 2 * 1000);
    btceScheduler.schedule(bookkeeper.fetchDepth.bind(bookkeeper, btce, btceBTCUSD), 5 * 1000);

    var bitstampScheduler = new PromiseScheduler(2 * 1000);
    var bitstamp = new Bitstamp();
    var bitstampBTCUSD = markets.get("bitstamp", "BTC", "USD");
    bitstampScheduler.schedule(bookkeeper.fetchTicker.bind(bookkeeper, bitstamp, bitstampBTCUSD), 3 * 1000);
    bitstampScheduler.schedule(bookkeeper.fetchTrades.bind(bookkeeper, bitstamp, bitstampBTCUSD), 2 * 1000);
    bitstampScheduler.schedule(bookkeeper.fetchDepth.bind(bookkeeper, bitstamp, bitstampBTCUSD), 5 * 1000);

    var bitfinexScheduler = new PromiseScheduler(2 * 1000);
    var bitfinex = new Bitfinex();
    var bitfinexBTCUSD = markets.get("bitfinex", "BTC", "USD");
    bitfinexScheduler.schedule(bookkeeper.fetchTicker.bind(bookkeeper, bitfinex, bitfinexBTCUSD), 3 * 1000);
    bitfinexScheduler.schedule(bookkeeper.fetchTrades.bind(bookkeeper, bitfinex, bitfinexBTCUSD), 2 * 1000);
    bitfinexScheduler.schedule(bookkeeper.fetchDepth.bind(bookkeeper, bitfinex, bitfinexBTCUSD), 5 * 1000);
    var bitfinexUSDrate = markets.get("bitfinex", "USD", "rate");
    bitfinexScheduler.schedule(() => fetching.fetchLends(db, server, bitfinexUSDrate, bitfinex.fetchLends.bind(bitfinex)), 15 * 1000);
    bitfinexScheduler.schedule(() => fetching.fetchLendBook(db, server, bitfinexUSDrate, bitfinex.fetchLendBook.bind(bitfinex)), 30 * 1000);
}

function setupPeriodicJobs(db: database.Database) {
    _.each(config.candleTimespans, (timespan: number) => {
        setInterval(() => {
            _.each(markets.all, market => {
                aggregate.buildCandles(db, market, timespan);
            });
        }, timespan * 1000);
    });

    setInterval(() => {
        _.each(markets.all, market => {
            aggregate.cleanOldDepth(db, market);
        });
    }, 15 * 60 * 1000);
}
