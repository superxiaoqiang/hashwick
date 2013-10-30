class Trade {
    public static BUY = 1;
    public static SELL = 2;
    public static LIMIT = 4;
    public static MARKET = 8;

    constructor(public timestamp: Date, public flags: number,
        public price: string, public amount: string, public id_from_exchange: string) { }
}

export = Trade;
