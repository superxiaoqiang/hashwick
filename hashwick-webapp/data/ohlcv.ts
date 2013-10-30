import MinMaxPair = require("../../lib/minMaxPair");
import time = require("../utils/time");
import models_ = require("./models");
if (0) models_;
import Candle = models_.Candle;
import Trade = models_.Trade;


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
    return <MinMaxPair<number>>new MinMaxPair(min, max);
}
