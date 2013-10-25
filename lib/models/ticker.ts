class Ticker {
    constructor(public left: string, public right: string, public timestamp: Date,
                public last: string, public bid: string, public ask: string) { }

    public equivalent(other: Ticker) {
        return this.left === other.left && this.right === other.right &&
            this.last === other.last && this.bid === other.bid && this.ask === other.ask;
    }
}

export = Ticker;
