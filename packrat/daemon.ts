/// <reference path="../vendor/bluebird/bluebird.d.ts" />
/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("underscore");

import Logger = require("../lib/logger");
import Bitfinex = require("../lib/exchanges/bitfinex");
import Bitstamp = require("../lib/exchanges/bitstamp");
import BTCE = require("../lib/exchanges/btce");
import MtGox = require("../lib/exchanges/mtgox");
import config = require("./config");
import aggregate = require("./lib/aggregate");
import bookkeeper_ = require("./lib/bookkeeper");
if (0) bookkeeper_;
import Bookkeeper = bookkeeper_.Bookkeeper;
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
    bookkeeper.add({
        exchange: new MtGox(),
        market: markets.get("mtgox", "BTC", "USD"),
        pollSchedulingGroup: "mtgox",
        pollSchedulingGroupMinDelay: 3 * 1000,
        tickerPollRate: 30 * 1000,
        tradesPollRate: 30 * 1000,
        depthPollRate: 30 * 1000,
    });
    bookkeeper.add({
        exchange: new BTCE(),
        market: markets.get("btce", "BTC", "USD"),
        pollSchedulingGroup: "btce",
        pollSchedulingGroupMinDelay: 3 * 1000,
        tickerPollRate: 5 * 1000,
        tradesPollRate: 5 * 1000,
    });
    bookkeeper.add({
        exchange: new Bitstamp(),
        market: markets.get("bitstamp", "BTC", "USD"),
        pollSchedulingGroup: "bitstamp",
        pollSchedulingGroupMinDelay: 3 * 1000,
        tickerPollRate: 5 * 1000,
        tradesPollRate: 5 * 1000,
    });
    bookkeeper.add({
        exchange: new Bitfinex(),
        market: markets.get("bitfinex", "BTC", "USD"),
        pollSchedulingGroup: "bitfinex",
        pollSchedulingGroupMinDelay: 3 * 1000,
        tickerPollRate: 5 * 1000,
        tradesPollRate: 5 * 1000,
    });
}

function setupPeriodicJobs(db: database.Database) {
    _.each(config.candleTimespans, (timespan: number) => {
        setInterval(() => {
            _.each(markets.all, market => {
                aggregate.buildCandles(db, market, timespan);
            })
        }, timespan * 1000);
    });
}
