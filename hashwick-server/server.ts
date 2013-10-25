/// <reference path="../vendor/express/express.d.ts" />

import http = require("http");

import express = require("express");

import config = require("./config");
import controllers = require("./controllers");


var app = express();
app.set("view engine", "jade");
app.set("views", __dirname + "/templates");
if (app.get("env") === "development") {
    var browserify = require("browserify-middleware");
    app.get("/static/app.js", browserify("../hashwick-webapp/app.js", {basedir: "../hashwick-webapp"}));
}

app.get("/", controllers.index);

http.createServer(app).listen(config.httpPort);
