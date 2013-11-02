import MtGoxWatcher = require("./mtgox");
import BTCEWatcher = require("./btce");
import BitstampWatcher = require("./bitstamp");
import BitfinexWatcher = require("./bitfinex");
import Watcher = require("./watcher");


var watchers: Watcher[] = [
    new MtGoxWatcher(),
    new BTCEWatcher(),
    new BitstampWatcher(),
    new BitfinexWatcher(),
];

export = watchers;
