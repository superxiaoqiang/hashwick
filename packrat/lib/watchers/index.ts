import MtGoxWatcher = require("./mtgox");
import BTCEWatcher = require("./btce");
import BitstampWatcher = require("./bitstamp");
import Watcher = require("./watcher");


var watchers: Watcher[] = [
    new MtGoxWatcher(),
    new BTCEWatcher(),
    new BitstampWatcher(),
];

export = watchers;
