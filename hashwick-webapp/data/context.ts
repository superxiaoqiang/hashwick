import SimpleCache = require("../../lib/simpleCache");
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import interfaces = require("./interfaces");
import markets = require("./markets");
import serialization = require("./serialization");


export class SerializationContext {
    private dataSourcesByKey: { [key: string]: interfaces.DataSource; } = {};
    public dataSourceCapsules: Capsule<interfaces.SerializedDataSource>[] = [];
    private marketsByKey: { [key: string]: markets.Market; } = {};
    public marketCapsules: Capsule<markets.SerializedMarket>[] = [];

    constructor() { }

    public sealMarket(market: Capsule<markets.Market>): CapsuleRef<markets.SerializedMarket> {
        if (this.marketsByKey[market.key])
            return {key: market.key};

        this.marketsByKey[market.key] = market.item;
        var capsule = new Capsule(market.key, market.name, market.item.serialize());
        this.marketCapsules.push(capsule);
        return {key: capsule.key};
    }

    public sealDataSource(dataSource: Capsule<interfaces.DataSource>): CapsuleRef<interfaces.SerializedDataSource> {
        if (this.dataSourcesByKey[dataSource.key])
            return {key: dataSource.key};

        this.dataSourcesByKey[dataSource.key] = dataSource.item;
        var capsule = new Capsule(dataSource.key, dataSource.name, dataSource.item.serialize(this));
        this.dataSourceCapsules.push(capsule);
        return {key: capsule.key};
    }
}


export class DeserializationContext {
    private serializedMarkets: Capsule<markets.SerializedMarket>[];
    private serializedDataSources: Capsule<interfaces.SerializedDataSource>[];
    private markets = new SimpleCache<Capsule<markets.Market>>();
    private dataSources = new SimpleCache<Capsule<interfaces.DataSource>>();

    constructor(markets: Capsule<markets.SerializedMarket>[], dataSources: Capsule<interfaces.SerializedDataSource>[]) {
        this.serializedMarkets = markets;
        this.serializedDataSources = dataSources;
    }

    public unsealMarket(ref: CapsuleRef<markets.SerializedMarket>) {
        return this.markets.get(ref.key, () => {
            var capsule = _.find(this.serializedMarkets, c => c.key === ref.key);
            return new Capsule(capsule.key, capsule.name, markets.deserializeMarket(capsule.item));
        });
    }

    public unsealDataSource(ref: CapsuleRef<interfaces.SerializedDataSource>) {
        return this.dataSources.get(ref.key, () => {
            var capsule = _.find(this.serializedDataSources, c => c.key === ref.key);
            return new Capsule(capsule.key, capsule.name, serialization.deserializeDataSource(this, capsule.item));
        });
    }
}
