class Market {
    constructor(public id: number, public exchangeName: string,
                public left: string, public right: string) { }

    public describe() {
        return this.exchangeName + " " + this.left + "/" + this.right;
    }
}

export = Market;
