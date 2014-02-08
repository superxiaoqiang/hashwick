import math = require("./math");
import strings = require("./strings");


export function makeXTicks(scale: { range(): number[]; ticks(count: number): any[] }) {
    var range = scale.range();
    var rangeSpan = range[1] - range[0];
    var numTicks = 12 - 4000 / (rangeSpan + 300);
    numTicks = numTicks < 2 ? 2 : numTicks;
    return scale.ticks(numTicks);
}

export function makeYTicks(scale: { range(): number[]; ticks(count: number): any[] }) {
    var range = scale.range();
    var rangeSpan = range[0] - range[1];
    var numTicks = 12 - 4000 / (rangeSpan + 333);
    numTicks = numTicks < 2 ? 2 : numTicks;
    return scale.ticks(numTicks);
}

export function scaleFormatter(ticks: { [index: number]: number; length: number; }) {
    var max = Math.max(ticks[0], ticks[ticks.length - 1]);
    var delta = Math.abs(ticks[1] - ticks[0]);
    var mag = Math.floor(math.log2(delta, 10));
    if (max >= 1000 && mag >= 2) {
        return function (n: number) {
            if (n === 0)
                return "0";
            return strings.formatNumberFixed(n / 1000, mag < 3 ? 3 - mag : 0) + "k";
        };
    } else {
        return function (n: number) {
            return strings.formatNumberFixed(n, mag < 0 ? -mag : 0);
        };
    }
}
