class Ticker {
    constructor(public timestamp: Date,
                public last: string, public bid: string, public ask: string) { }

    public equivalent(other: Ticker) {
        return this.last === other.last && this.bid === other.bid && this.ask === other.ask;
    }
}

export = Ticker;
