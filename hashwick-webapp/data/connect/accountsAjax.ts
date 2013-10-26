import logger_ = require("../../logger");
if (0) logger_;
import Logger = logger_.Logger;
import user = require("../../user");


var log = new Logger("data.connect.accountsAjax");


function makeAccountAPIArgs(account: user.ExchangeAccount) {
    var ret = _.map(account.exchange.credentials, cred => account.credentials[cred.key]);
    return JSON.stringify(ret);
}

export function getAccountBalances(account: user.ExchangeAccount): JQueryGenericPromise<BalancesResponse> {
    return $.ajax({
        method: "POST",
        url: "/api/behest/get-balances",
        data: {
            token: user.currentUser.token,
            accountType: account.exchange.id,
            apiArgs: makeAccountAPIArgs(account),
        },
        dataType: "json",
    }).then((data: BalancesResponse) => {
        log.info("Success from /api/behest/get-balances");
        _.each(data.response.balances, balance => {
            balance.total = parseFloat(<any>balance.total);
        });
        return data;
    }, (): any => {
        log.error("Error from /api/behest/get-balances");
    });
}

export interface BalancesResponse {
    response: {
        balances: { [asset: string]: AssetBalance; };
    };
}

export interface AssetBalance {
    total: number;
}
