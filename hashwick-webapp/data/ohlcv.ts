import MinMaxPair = require("../../lib/minMaxPair");
import time = require("../utils/time");
import models_ = require("./models");
if (0) models_;
import Candle = models_.Candle;
import Trade = models_.Trade;


export function resampleCandles(candles: Candle[], period: number) {
    // This currently only handles downsampling, not upsampling (I'm not even
    // sure if/how that would work)

    if (!candles.length || candles[0].timespan === period)
        return candles;

    var c = 0;
    var candle = candles[0];
    var ret: Candle[] = [];
    var period000 = period * 1000;
    var start = time.roundDate(candle.start, period, Math.floor).getTime();
    var end = start + period000;

    while (candle) {
        if (candle.end.getTime() <= end) {
            var startingCandle = candle;

            var open = candle.open;
            var close = candle.close;
            var buy_open = candle.buy_open;
            var sell_open = candle.sell_open;
            var buy_close = candle.buy_close;
            var sell_close = candle.sell_close;
            var buy_low = candle.buy_low;
            var sell_low = candle.sell_low;
            var buy_high = candle.buy_high;
            var sell_high = candle.sell_high;
            var buy_volume = candle.buy_volume;
            var sell_volume = candle.sell_volume;
            var buy_vwap = candle.buy_vwap * buy_volume;
            var sell_vwap = candle.sell_vwap * sell_volume;
            var buy_count = candle.buy_count;
            var sell_count = candle.sell_count;

            candle = candles[++c];
            while (candle && candle.end.getTime() <= end) {
                close = candle.close;
                buy_close = candle.buy_close;
                sell_close = candle.sell_close;
                if (candle.buy_low < buy_low) buy_low = candle.buy_low;
                if (candle.sell_low < sell_low) sell_low = candle.sell_low;
                if (candle.buy_high > buy_high) buy_high = candle.buy_high;
                if (candle.sell_high > sell_high) sell_high = candle.sell_high;
                buy_volume += candle.buy_volume;
                sell_volume += candle.sell_volume;
                buy_vwap += candle.buy_vwap * candle.buy_volume;
                sell_vwap += candle.sell_vwap * candle.sell_volume;
                buy_count += candle.buy_count;
                sell_count += candle.sell_count;
                candle = candles[++c];
            }

            ret.push({
                start: new Date(start),
                end: new Date(end),
                timespan: (start - end) / 1000,
                open: open,
                close: close,
                low: buy_low < sell_low ? buy_low : sell_low,
                high: buy_high > sell_high ? buy_high : sell_high,
                volume: buy_volume + sell_volume,
                vwap: buy_volume + sell_volume ? (buy_vwap + sell_vwap) / (buy_volume + sell_volume) : startingCandle.vwap,
                count: buy_count + sell_count,
                buy_open: buy_open,
                sell_open: sell_open,
                buy_close: buy_close,
                sell_close: sell_close,
                buy_low: buy_low,
                sell_low: sell_low,
                buy_high: buy_high,
                sell_high: sell_high,
                buy_volume: buy_volume,
                sell_volume: sell_volume,
                buy_vwap: buy_volume ? buy_vwap / buy_volume : startingCandle.buy_vwap,
                sell_vwap: sell_volume ? sell_vwap / sell_volume : startingCandle.sell_vwap,
                buy_count: buy_count,
                sell_count: sell_count,
            });
        }

        start += period000;
        end += period000;
    }
    return ret;
}


export function calcCandlesRange(candles: Candle[]) {
    if (!candles.length)
        return new MinMaxPair<number>();

    var min = candles[0].low;
    var max = candles[0].high;
    for (var c = 0, clen = candles.length; c < clen; ++c) {
        var candle = candles[c];
        if (candle.low < min)
            min = candle.low;
        if (candle.high > max)
            max = candle.high;
    }
    return new MinMaxPair<number>(min, max);
}
