/// <reference path="../vendor/d3/d3.d.ts" />
/// <reference path="../vendor/jquery/jquery.d.ts" />
/// <reference path="../vendor/underscore/underscore.d.ts" />

import config = require("./config");
import logger_ = require("./logger");
if (0) logger_;
import Logger = logger_.Logger;
import markets = require("./data/markets");
import frame = require("./ui/frame");
import layout = require("./ui/layout");
import user = require("./user");

// This is imported just for the side effects
import views = require("./views/views");
if (0) views;


function run(conf: any) {
    var log = new Logger("app");
    log.info("Starting\u2026");
    logTimeInfo(log);

    $("main").html("Loading&hellip;");

    _.extend(config, conf);

    markets.init();
    frame.init();
    user.init().then(afterInit, afterInit);
    function afterInit() {
        layout.setLayout(null);
    }
}

function logTimeInfo(log: Logger) {
    var now = new Date();
    log.info("UTC time is " + now.toISOString());
    log.info("local time is " + now.toString());
}

window["HashWick"] = {run: run};
