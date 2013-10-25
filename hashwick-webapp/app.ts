/// <reference path="../vendor/zepto/zepto.d.ts" />

import Logger = require("../lib/logger");


function run() {
    new Logger("app").info("Starting\u2026");
    $("main").html("Loading&hellip;");
}

window["HashWick"] = {run: run};
