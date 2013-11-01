import _ = require("underscore");


export function splat(func: Function) {
    return (array: any[]) => func.apply(this, array);
}

export function uniqViaObject<T>(xs: T[], keyer: (x: T) => string): T[]
export function uniqViaObject<T>(xs: T[], keyer: (x: T) => number): T[]
export function uniqViaObject<T>(xs: T[], keyer: (x: T) => any): T[] {
    // This is much faster than _.uniq if items can be keyed by string or number
    // It runs in O(n) instead of O(n^2)
    var ret: T[] = [];
    var seen = {};
    _.each(xs, x => {
        var key = keyer(x);
        if (!(key in seen)) {
            seen[key] = undefined;
            ret.push(x);
        }
    });
    return ret;
}
