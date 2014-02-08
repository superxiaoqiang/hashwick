import SimpleCache = require("../../../lib/simpleCache");
import user = require("../../user");
import time = require("../../utils/time");
import context = require("../context");
import interfaces = require("../interfaces");
import models = require("../models");
import serialization = require("../serialization");
import accountsAjax = require("./accountsAjax");


export class AccountLivePortfolioDataSource extends interfaces.LivePortfolioDataSource {
    public static type = "accountLivePortfolio";
    private static instances = new SimpleCache<AccountLivePortfolioDataSource>();

    private account: user.ExchangeAccount;
    private interval = 60;
    private snapshot: models.SnapshotData<models.Portfolio>;

    public static get(account: user.ExchangeAccount) {
        return this.instances.get(account.id, () => new this(account));
    }

    public static deserialize(context: context.DeserializationContext, structure: SerializedAccountPortfolioDataSource) {
        var account = _.findWhere(user.currentUser.accounts, {id: structure.account});
        return this.get(account);
    }

    constructor(account: user.ExchangeAccount) {
        super();
        this.account = account;
    }

    public serialize(context: context.SerializationContext): SerializedAccountPortfolioDataSource {
        return {
            type: AccountLivePortfolioDataSource.type,
            account: this.account.id,
        };
    }

    public description() {
        return this.account.shortName + " portfolio";
    }

    public getFromMemory() {
        return this.snapshot;
    }

    public prefetch() {
        if (this.isUpToDate(this.interval))
            return Promise.fulfilled<void>();
        return this.fetchUncached();
    }

    private fetchUncached() {
        return accountsAjax.getAccountBalances(this.account).then(data => {
            var portfolio = {
                assets: data.response.balances,
            };
            this.snapshot = new models.SnapshotData<models.Portfolio>(time.serverNow(), portfolio);
        }).catch(err => {
            // TODO: display/log error
            throw err;
        });
    }
}

export interface SerializedAccountPortfolioDataSource extends interfaces.SerializedDataSource {
    account: string;
}

serialization.dataSourceClasses[AccountLivePortfolioDataSource.type] = AccountLivePortfolioDataSource;
