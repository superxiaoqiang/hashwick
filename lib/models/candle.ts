class Candle {
    start: Date;
    end: Date;
    timespan: number;
    open: number;
    close: number;
    low: number;
    high: number;
    volume: number = 0;
    vwap: number;
    count: number = 0;
    buy_open: number;
    buy_close: number;
    buy_low: number;
    buy_high: number;
    buy_volume: number = 0;
    buy_vwap: number;
    buy_count: number = 0;
    sell_open: number;
    sell_close: number;
    sell_low: number;
    sell_high: number;
    sell_volume: number = 0;
    sell_vwap: number;
    sell_count: number = 0;

    constructor(start: Date, timespan: number) {
        this.start = start;
        this.timespan = timespan;
        this.end = new Date(start.getTime() + timespan * 1000);
    }
}

export = Candle;
