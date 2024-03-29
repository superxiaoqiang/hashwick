/// <reference path="../vendor/express/express.d.ts" />
/// <reference path="../vendor/lodash/lodash.d.ts" />

import http = require("http");

import express = require("express");

import config = require("./config");
import controllers = require("./controllers");


var app = express();
app.set("view engine", "jade");
app.set("views", __dirname + "/templates");

if (config.devMode) {
    var browserify = require("browserify-middleware");
    app.get("/static/compiled/app.js", browserify("../hashwick-webapp/app.js", {basedir: "../hashwick-webapp"}));

    var stylus = require("stylus");
    var nib = require("nib");
    app.use("/static/compiled", stylus.middleware({
        src: __dirname + "/../hashwick-webapp",
        dest: __dirname + "/static/compiled",
        compile: (str: string, path: string) => stylus(str).set("filename", path).use(nib()),
    }));

    app.use("/static", express.static(__dirname + "/static"));
}

app.get("/", controllers.index);

app.get('/favicon.ico', (req, res) => { res.sendfile(__dirname + '/static/favicon.ico'); });

http.createServer(app).listen(config.httpPort);
