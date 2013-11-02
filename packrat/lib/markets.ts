import _ = require("underscore");


export class Market {
    constructor(public id: number, public exchangeName: string,
                public left: string, public right: string) { }
}

export var all = [
    new Market(1, "mtgox", "BTC", "USD"),
    new Market(3, "btce", "BTC", "USD"),
    new Market(4, "bitstamp", "BTC", "USD"),
    new Market(5, "bitfinex", "BTC", "USD"),
];

export function byID(id: number) {
    return _.findWhere(all, {id: id});
}

export function byName(name: string) {
    return _.where(all, {name: name});
}

export function get(exchangeName: string, left: string, right: string) {
    return _.findWhere(all, {exchangeName: exchangeName, left: left, right: right});
}
