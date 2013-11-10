class PendingPromise<T> {
    private inst: PromiseResolver<T>;

    public promise() {
        if (!this.inst)
            this.inst = Promise.pending();
        return this.inst.promise;
    }

    public isPending(): boolean {
        return <any>this.inst;
    }

    public resolve(value?: T) {
        if (this.inst) {
            this.inst.fulfill(value);
            this.inst = null;
        }
    }
}

export = PendingPromise;
