/// <reference path="../vendor/node/node.d.ts" />
/// <reference path="../vendor/pg/pg.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />
/// <reference path="../vendor/ws/ws.d.ts" />

import _ = require("underscore");
import pg = require("pg");
import WebSocket = require("ws");

import Logger = require("../lib/logger");
import config = require("./config");
import Collector = require("./lib/collector");
import watchers = require("./lib/watchers/index");


var logger = new Logger("packrat.daemon");
logger.info("starting");


var server = new WebSocket.Server({port: config.websocketPort});


var db = new pg.Client(config.database);
db.connect((err: any) => {
    if (err)
        throw err;

    _.each(watchers, watcher => {
        new Collector(watcher, db, server).start();
        watcher.start();
    });
    logger.info("started");
});
