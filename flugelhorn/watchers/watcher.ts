import Ticker = require("../../lib/models/ticker");
import Trade = require("../../lib/models/trade");


class Watcher {
    public onTicker: (ticker: Ticker) => void;
    public onTrade: (trade: Trade) => void;

    public start() { }
}

export = Watcher;
