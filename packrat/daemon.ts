/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("underscore");
import pg = require("pg");

import Logger = require("../lib/logger");
import config = require("./config");
import aggregate = require("./lib/aggregate");
import Collector = require("./lib/collector");
import markets = require("./lib/markets");
import Flugelserver = require("./lib/server");
import watchers = require("./lib/watchers/index");


var logger = new Logger("packrat.daemon");
logger.info("starting");


var server = new Flugelserver(config.websocketPort);


var db = new pg.Client(config.database);
db.connect((err: any) => {
    if (err)
        throw err;
    setupCollectors();
    setupPeriodicJobs();
    logger.info("started");
});



function setupCollectors() {
    _.each(watchers, watcher => {
        new Collector(watcher, db, server).start();
        watcher.start();
    });
}

function setupPeriodicJobs() {
    _.each(config.candleTimespans, (timespan: number) => {
        setInterval(() => {
            _.each(markets.all, market => {
                aggregate.buildCandles(db, market, timespan);
            })
        }, timespan * 1000);
    });
}
