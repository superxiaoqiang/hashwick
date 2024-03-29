import calc = require("./calc");
import dataStack_ = require("./dataStack");
if (0) dataStack_;
import SnapshotDataStackSourceInfo = dataStack_.SnapshotDataStackSourceInfo;
import TemporalDataStackSourceInfo = dataStack_.TemporalDataStackSourceInfo;
import PeriodicTemporalDataStackSourceInfo = dataStack_.PeriodicTemporalDataStackSourceInfo;
import marketData = require("./marketData");
import models_ = require("./models");
if (0) models_;
import Candle = models_.Candle;
import DepthData = models_.DepthData;
import Ticker = models_.Ticker;
import Trade = models_.Trade;
import flugelhorn = require("./connect/flugelhorn");
import mtgox = require("./connect/mtgox");
import bitstamp = require("./connect/bitstamp");


export class Exchange {
    public id: string;
    public name: string;
    public defaultShortName: string;
    public credentials: ExchangeCredential[];
    public credentialsURL: string;
    public markets: Market[];

    public serialize() {
        return this.id;
    }
}

export interface ExchangeCredential {
    key: string;
    label: string;
}

export class Market {
    exchange: Exchange;
    left: string;
    right: string;
    description: string;
    liveTickerDataSources: SnapshotDataStackSourceInfo<Ticker>[];
    tradesDataSources: TemporalDataStackSourceInfo<Trade>[];
    ohlcvDataSources: PeriodicTemporalDataStackSourceInfo<Candle>[];
    liveDepthDataSources: SnapshotDataStackSourceInfo<DepthData>[];

    public serialize(): SerializedMarket {
        return {
            exchange: this.exchange.serialize(),
            left: this.left,
            right: this.right,
        };
    }

    public cacheKey() {
        return this.exchange.id + ":" + this.left + ":" + this.right;
    }
}

export interface SerializedMarket {
    exchange: string;
    left: string;
    right: string;
}


export function deserializeExchange(id: string) {
    return exchanges[id];
}

export function deserializeMarket(structure: SerializedMarket) {
    var exchange = exchanges[structure.exchange];
    return getMarket(exchange, structure.left, structure.right);
}

export function getMarket(exchange: Exchange, left: string, right: string) {
    return _.findWhere(exchange.markets, {left: left, right: right});
}


function makeExchange(structure: any) {
    var exchange = <Exchange>_.extend(new Exchange(), structure);
    exchange.markets = _.map(structure.markets, (market: any) => makeMarket(exchange, market));
    return exchange;
}

function makeMarket(exchange: Exchange, structure: any) {
    var ret = <Market>_.extend(new Market(), {
        exchange: exchange,
        description: exchange.name + " " + structure.left + "/" + structure.right,
    }, structure);
    ret.liveTickerDataSources.push({
        source: new calc.InferLiveTickerDataSource(
            new marketData.MarketTradesDataSource({key: null, name: null, item: ret}),
            new marketData.MarketLiveDepthDataSource({key: null, name: null, item: ret})),
    });
    ret.ohlcvDataSources.push({
        source: new calc.TradesToCandlesDataSource(
            new marketData.MarketTradesDataSource({key: null, name: null, item: ret})),
        role: "partial",
    });
    return ret;
}


export var exchanges: { [id: string]: Exchange };

export function init() {
    exchanges = _.indexBy(_.map([{
        id: "1",
        name: "Mt. Gox",
        defaultShortName: "g",
        credentials: [
            {key: "apiKey", label: "API Key"},
            {key: "secret", label: "Secret"},
        ],
        credentialsURL: "https://www.mtgox.com/security",
        markets: [{
            left: "BTC",
            right: "USD",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("1")},
                {source: new mtgox.LiveTickerDataSource("d5f06780-30a8-4a48-a2f8-7ed181b4a13f")},
            ],
            tradesDataSources: [
                {source: new flugelhorn.RealtimeTrades("1"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("1"), role: "historical"},
                {source: new mtgox.TradesDataSource("dbf1dee9-4f2e-4a08-8cb7-748919a71b21", "USD"), role: "realtime"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("1"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("1")},
            ],
        }],
    }, {
        id: "2",
        name: "Bitfloor",
        defaultShortName: "f",
        credentials: [
            {key: "apiKey", label: "API Key"},
            {key: "secret", label: "Secret"},
        ],
        credentialsURL: "https://www.bitfloor.com/",
        markets: [{
            left: "BTC",
            right: "USD",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("0")},
            ],
            tradesDataSources: [
                {source: new flugelhorn.RealtimeTrades("0"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("0"), role: "historical"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("0"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("0")},
            ],
        }],
    }, {
        id: "3",
        name: "BTC-E",
        defaultShortName: "e",
        credentials: [
            {key: "apiKey", label: "API Key"},
            {key: "secret", label: "Secret"},
        ],
        credentialsURL: "https://btc-e.com/profile#api_keys",
        markets: [{
            left: "BTC",
            right: "USD",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("3")},
            ],
            tradesDataSources: [
                {source: new flugelhorn.RealtimeTrades("3"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("3"), role: "historical"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("3"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("3")},
            ],
        }],
    }, {
        id: "4",
        name: "Bitstamp",
        defaultShortName: "s",
        credentials: [
            {key: "apiKey", label: "API Key"},
            {key: "secret", label: "Secret"},
        ],
        credentialsURL: "https://www.bitstamp.net/account/security/api/",
        markets: [{
            left: "BTC",
            right: "USD",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("4")},
            ],
            tradesDataSources: [
                {source: new bitstamp.TradesDataSource(), role: "realtime"},
                {source: new flugelhorn.RealtimeTrades("4"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("4"), role: "historical"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("4"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("4")},
            ],
        }],
    }, {
        id: "5",
        name: "Bitfinex",
        defaultShortName: "x",
        credentials: [
            {key: "apiKey", label: "API Key"},
            {key: "secret", label: "Secret"},
        ],
        credentialsURL: "https://bitfinex.com/account/api",
        markets: [{
            left: "BTC",
            right: "USD",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("5")},
            ],
            tradesDataSources: [
                {source: new flugelhorn.RealtimeTrades("5"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("5"), role: "historical"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("5"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("5")},
            ],
        }, {
            left: "USD",
            right: "rate",
            liveTickerDataSources: [
                {source: new flugelhorn.LiveTicker("6")},
            ],
            tradesDataSources: [
                {source: new flugelhorn.RealtimeTrades("6"), role: "realtime"},
                {source: new flugelhorn.HistoricalTrades("6"), role: "historical"},
            ],
            ohlcvDataSources: [
                {source: new flugelhorn.Candles("6"), role: "historical"},
            ],
            liveDepthDataSources: [
                {source: new flugelhorn.LiveDepth("6")},
            ],
        }],
    }], makeExchange), xchg => xchg.id);
}
