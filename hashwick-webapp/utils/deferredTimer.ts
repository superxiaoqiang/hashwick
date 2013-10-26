class DeferredTimer {
    private interval: number;
    public counter: number;
    private timeout: number;

    constructor(interval: number) {
        this.interval = interval;
        this.counter = 0;
        this.timeout = null;
    }

    public increment() {
        ++this.counter;
        this.start();
    }

    public decrement() {
        if (!--this.counter)
            this.stop();
    }

    private start = () => {
        if (this.timeout === null)
            this.timeout = setTimeout(this.callTick, this.interval * 1000);
    };

    private stop() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    private callTick = () => {
        this.timeout = null;
        this.tick().then(this.start, this.start);
    };

    public tick(): JQueryGenericPromise<void> {
        return $.Deferred().resolve();
    }
}

export = DeferredTimer;
