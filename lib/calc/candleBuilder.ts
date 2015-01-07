import date = require("../date")
import Trade = require("../models/trade");
import Candle = require("../models/candle");


class CandleBuilder {
    public onCandle: (candle: Candle) => void;
    private candle: Candle;
    private opposingVolume: number;
    private buy_opposingVolume: number;
    private sell_opposingVolume: number;

    constructor(private timespan: number) { }

    public feedTrade(trade: Trade) {
        var price = parseFloat(trade.price);
        var amount = parseFloat(trade.amount);

        this.checkBoundary(trade.timestamp);

        if (this.candle.open === undefined)
            this.candle.open = price;
        this.candle.close = price;
        if (this.candle.low === undefined || price < this.candle.low)
            this.candle.low = price;
        if (this.candle.high === undefined || price > this.candle.high)
            this.candle.high = price;
        this.candle.volume += amount;
        this.opposingVolume += price * amount;
        this.candle.count += 1;

        if (trade.flags & Trade.BUY)
            this.addToSide("buy", price, amount);
        if (trade.flags & Trade.SELL)
            this.addToSide("sell", price, amount);
    }

    public sendIncompleteCandle() {
        if (this.candle && this.candle.open !== undefined)
            this.sendCandle();
    }

    // one func for both sides was a dumb, unwieldy idea; this should be split into separate buy/sell funcs
    private addToSide(side: string, price: number, amount: number) {
        if ((<any>this.candle)[side + "_open"] === undefined)
            (<any>this.candle)[side + "_open"] = price;
            (<any>this.candle)[side + "_close"] = price;
        if ((<any>this.candle)[side + "_low"] === undefined || price < (<any>this.candle)[side + "_low"])
            (<any>this.candle)[side + "_low"] = price;
        if ((<any>this.candle)[side + "_high"] === undefined || price > (<any>this.candle)[side + "_high"])
            (<any>this.candle)[side + "_high"] = price;
        (<any>this.candle)[side + "_volume"] += amount;
        (<any>this)[side + "_opposingVolume"] += amount * price;
        ++(<any>this.candle)[side + "_count"];
    }

    private checkBoundary(timestamp: Date) {
        if (this.candle) {
            var boundary = this.candle.start.getTime() + this.candle.timespan * 1000;
            if (timestamp.getTime() < boundary)
                return;

            this.sendCandle();
        }

        this.resetCandle(date.roundDown(timestamp, this.timespan));
    }

    private resetCandle(start: Date) {
        this.candle = new Candle(start, this.timespan);
        this.opposingVolume = 0;
        this.buy_opposingVolume = 0;
        this.sell_opposingVolume = 0;
    }

    private sendCandle() {
        if (this.candle.volume)
            this.candle.vwap = this.opposingVolume / this.candle.volume;
        if (this.candle.buy_volume)
            this.candle.buy_vwap = this.buy_opposingVolume / this.candle.buy_volume;
        if (this.candle.sell_volume)
            this.candle.sell_vwap = this.sell_opposingVolume / this.candle.sell_volume;
        this.onCandle(this.candle);
    }
}

export = CandleBuilder;
