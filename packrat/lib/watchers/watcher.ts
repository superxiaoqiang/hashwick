import Signal = require("../../../lib/signal");
import Ticker = require("../../../lib/models/ticker");
import Trade = require("../../../lib/models/trade");


class Watcher {
    public exchangeName: string;

    public onTicker = new Signal();
    public onTrade = new Signal();

    public start() { }
}

export = Watcher;
