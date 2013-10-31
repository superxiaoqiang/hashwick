import date = require("../date")
import Candle = require("../models/candle");


class CandleResampler {
    public onCandle: (candle: Candle) => void;
    private destCandle: Candle;
    private opposingVolume: number;
    private buy_opposingVolume: number;
    private sell_opposingVolume: number;

    constructor(private period: number) { }

    private resetCandle(start: Date) {
        this.destCandle = new Candle(date.roundDown(start, this.period), this.period);
        this.opposingVolume = 0;
        this.buy_opposingVolume = 0;
        this.sell_opposingVolume = 0;
    }

    private sendCandle() {
        if (this.destCandle.volume)
            this.destCandle.vwap = this.opposingVolume / this.destCandle.volume;
        if (this.destCandle.buy_volume)
            this.destCandle.buy_vwap = this.buy_opposingVolume / this.destCandle.buy_volume;
        if (this.destCandle.sell_volume)
            this.destCandle.sell_vwap = this.sell_opposingVolume / this.destCandle.sell_volume;
        this.onCandle(this.destCandle);
        this.destCandle = null;
    }

    public sendIncompleteCandle() {
        if (this.destCandle)
            this.sendCandle();
    }

    public feedCandle(c: Candle) {
        if (this.destCandle && c.start >= this.destCandle.end)
            this.sendCandle();
        if (!this.destCandle)
            this.resetCandle(c.start);

        if (this.destCandle.open === undefined)
            this.destCandle.open = c.open;
        if (c.close !== undefined)
            this.destCandle.close = c.close;
        if (this.destCandle.low === undefined || c.low < this.destCandle.low)
            this.destCandle.low = c.low;
        if (this.destCandle.high === undefined || c.high > this.destCandle.high)
            this.destCandle.high = c.high;
        this.destCandle.volume += c.volume;
        if (c.volume)
            this.opposingVolume += c.volume * c.vwap;
        this.destCandle.count += c.count;

        if (this.destCandle.buy_open === undefined)
            this.destCandle.buy_open = c.buy_open;
        if (c.buy_close !== undefined)
            this.destCandle.buy_close = c.buy_close;
        if (this.destCandle.buy_low === undefined || c.buy_low < this.destCandle.buy_low)
            this.destCandle.buy_low = c.buy_low;
        if (this.destCandle.buy_high === undefined || c.buy_high > this.destCandle.buy_high)
            this.destCandle.buy_high = c.buy_high;
        this.destCandle.buy_volume += c.buy_volume;
        if (c.buy_volume)
            this.buy_opposingVolume += c.buy_volume * c.buy_vwap;
        this.destCandle.buy_count += c.buy_count;

        if (this.destCandle.sell_open === undefined)
            this.destCandle.sell_open = c.sell_open;
        if (c.sell_close !== undefined)
            this.destCandle.sell_close = c.sell_close;
        if (this.destCandle.sell_low === undefined || c.sell_low < this.destCandle.sell_low)
            this.destCandle.sell_low = c.sell_low;
        if (this.destCandle.sell_high === undefined || c.sell_high > this.destCandle.sell_high)
            this.destCandle.sell_high = c.sell_high;
        this.destCandle.sell_volume += c.sell_volume;
        if (c.sell_volume)
            this.sell_opposingVolume += c.sell_volume * c.sell_vwap;
        this.destCandle.sell_count += c.sell_count;
        
        if (c.end >= this.destCandle.end)
            this.sendCandle();
    }
}

export = CandleResampler;
