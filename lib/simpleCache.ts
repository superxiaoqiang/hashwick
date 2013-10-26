class SimpleCache<T> {
    private items: { [key: string]: T } = {};

    public get(key: string, miss: () => T) {
        var ret = this.items[key];
        if (ret === undefined)
            ret = this.items[key] = miss();
        return ret;
    }
}

export = SimpleCache;
