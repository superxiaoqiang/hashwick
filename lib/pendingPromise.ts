class PendingPromise<T> {
    private inst: JQueryDeferred<T>;

    public promise() {
        return this.inst || (this.inst = $.Deferred());
    }

    public isPending(): boolean {
        return <any>this.inst;
    }

    public resolve(value?: T) {
        if (this.inst) {
            this.inst.resolve(value);
            this.inst = null;
        }
    }
}

export = PendingPromise;
