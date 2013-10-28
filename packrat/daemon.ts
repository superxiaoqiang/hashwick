/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("underscore");

import Logger = require("../lib/logger");
import config = require("./config");
import aggregate = require("./lib/aggregate");
import Collector = require("./lib/collector");
import database = require("./lib/database");
import markets = require("./lib/markets");
import Flugelserver = require("./lib/server");
import watchers = require("./lib/watchers/index");


var logger = new Logger("packrat.daemon");
logger.info("starting");


var server = new Flugelserver(config.websocketPort);


database.connect(config.database, (err, db) => {
    if (err)
        throw err;
    setupCollectors(db, server);
    setupPeriodicJobs(db);
    logger.info("started");
});



function setupCollectors(db: database.Database, server: Flugelserver) {
    _.each(watchers, watcher => {
        new Collector(watcher, db, server).start();
        watcher.start();
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
