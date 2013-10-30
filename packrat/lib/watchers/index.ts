import MtGoxWatcher = require("./mtgox");
import BTCEWatcher = require("./btce");
import Watcher = require("./watcher");


var watchers: Watcher[] = [
    new MtGoxWatcher(),
    new BTCEWatcher(),
];

export = watchers;
