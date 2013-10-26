import MinMaxPair = require("./minMaxPair");
import Signal = require("./signal");


export interface KeyFunc<T, V> { (value: V): T }
export interface RangeGetter<T, V> { (earliest: T, latest: T): JQueryGenericPromise<V[]> }

export class RangeCache<T, V> {
    // optimization opportunities:
    //  - use a binary search in getFromMemory
    //  - when getting new items, only merge/filter new items instead of entire list each time
    private keyFunc: KeyFunc<T, V>;
    private fetcher: RangeGetter<T, V>;
    private firstKey: T;
    private lastKey: T;
    private items: V[];
    public gotData: Signal;

    constructor(keyFunc: KeyFunc<T, V>, fetcher: RangeGetter<T, V>) {
        this.keyFunc = keyFunc;
        this.fetcher = fetcher;
        this.items = [];
        this.gotData = new Signal();
    }

    public getFromMemory(first: T, last: T) {
        var ret: V[] = [];
        for (var i = 0, ilen = this.items.length; i < ilen; ++i) {
            var item = this.items[i];
            var key = this.keyFunc(item);
            if (key >= first && key <= last)
                ret.push(item);
        }
        return ret;
    }

    public prefetch(first: T, last: T) {
        var needed = this.calcMissingRange(first, last);
        if (!needed)
            return;
        return this.fetcher(needed.min, needed.max).then(this.mergeItems);
    }

    private calcMissingRange(first: T, last: T) {
        if (!this.items.length)
            return new MinMaxPair<T>(first, last);

        if (first < this.firstKey)
            if (last > this.lastKey)
                return new MinMaxPair<T>(first, last);
            else
                return new MinMaxPair<T>(first, this.firstKey);
        else
            if (last > this.lastKey)
                return new MinMaxPair<T>(this.lastKey, last);
            else
                return null;
    }

    // type signature is necessary due to compiler bug as of v0.9.1.1
    public mergeItems: (newItems: V[]) => void = (newItems: V[]) => {
        var merged = this.items.concat(newItems);
        merged.sort((a, b) => <any>this.keyFunc(a) - <any>this.keyFunc(b));
        this.items = this.filterDupKeys(merged);
        if (this.items.length) {
            this.firstKey = this.keyFunc(this.items[0]);
            this.lastKey = this.keyFunc(this.items[this.items.length - 1]);
        }
        this.gotData.emit();
    };

    private filterDupKeys(items: V[]) {
        // this assumes `items` is sorted by `this.key`
        if (!items.length)
            return items;
        var ret = [items[0]];
        var prevKey = this.keyFunc(items[0]);
        for (var i = 1, ilen = items.length; i < ilen; ++i) {
            var item = items[i];
            var key = this.keyFunc(item);
            if (key !== prevKey) {
                prevKey = key;
                ret.push(item);
            }
        }
        return ret;
    }
}
