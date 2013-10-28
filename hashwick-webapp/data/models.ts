export class SnapshotData<T> {
    public timestamp: Date;
    public data: T;

    constructor(timestamp: Date, data: T) {
        this.timestamp = timestamp;
        this.data = data;
    }
}

export class TemporalData<T> {
    public data: T[];

    constructor(data: T[]) {
        this.data = data;
    }
}


export class Ticker {
    public last: number;
    public bid: number;
    public ask: number;
}

export class Trade {
    public static BUY = 1  // same as returned from johnsoft trades api
    public static SELL = 2
    public static LIMIT = 4
    public static MARKET = 8

    public timestamp: Date;
    public flags: number;
    public price: number;
    public amount: number;
    public id_from_exchange: string;

    constructor(timestamp: Date, flags: number, price: number, amount: number, id_from_exchange: string) {
        this.timestamp = timestamp;
        this.flags = flags;
        this.price = price;
        this.amount = amount;
        this.id_from_exchange = id_from_exchange;
    }

    public isBuy() {
        return this.flags & Trade.BUY;
    }

    public isSell() {
        return this.flags & Trade.SELL;
    }
}

export class Candle {
    start: Date;
    end: Date;
    timespan: number;
    open: number;
    close: number;
    low: number;
    high: number;
    volume: number = 0;
    vwap: number = 0;
    count: number = 0;
    buy_open: number;
    buy_close: number;
    buy_low: number;
    buy_high: number;
    buy_volume: number = 0;
    buy_vwap: number = 0;
    buy_count: number = 0;
    sell_open: number;
    sell_close: number;
    sell_low: number;
    sell_high: number;
    sell_volume: number = 0;
    sell_vwap: number = 0;
    sell_count: number = 0;

    constructor(start: Date, timespan: number) {
        this.start = start;
        this.timespan = timespan;
        this.end = new Date(start.getTime() + timespan * 1000);
    }
}

export interface DepthData {
    bids: DepthDataPoint[];
    asks: DepthDataPoint[];
}

export interface DepthDataPoint {
    price: number;
    amount: number;
}

export interface Portfolio {
    assets: { [asset: string]: PortfolioAsset };
}

export interface PortfolioAsset {
    total: number;
}
