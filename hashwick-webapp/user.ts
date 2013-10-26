import logger_ = require("./logger");
if (0) logger_;
import Logger = logger_.Logger;
import Signal = require("../lib/signal");
import markets = require("./data/markets");
import context = require("./data/context");
import layout = require("./ui/layout");
import layoutDefs_ = require("./ui/layoutDefs");
import SerializedLayout = layoutDefs_.SerializedLayout;


var log = new Logger("User");

export interface User {
    username: string;
    token: string;
    accounts: ExchangeAccount[];
}

class UserImpl {
    public username: string;
    public token: string;
    public accounts: ExchangeAccount[] = [];
}

export interface ExchangeAccount {
    id: string;
    exchange: markets.Exchange;
    shortName: string;
    credentials: { [name: string]: string; };
}

interface SerializedUserData {
    accounts: SerializedExchangeAccount[];
    layouts: { [name: string]: SerializedLayout; };
}

interface SerializedExchangeAccount {
    id: string;
    exchange: string;
    shortName: string;
    credentials: { [name: string]: string; };
}


function serializeUserData() {
    var accounts = _.map(currentUser.accounts, serializeExchangeAccount);
    var layouts = {current: layout.serializeCurrentLayout()};

    var data: SerializedUserData = {
        accounts: accounts,
        layouts: layouts,
    };
    return JSON.stringify(data);
}

function serializeExchangeAccount(account: ExchangeAccount): SerializedExchangeAccount {
    return {
        id: account.id,
        exchange: account.exchange.serialize(),
        shortName: account.shortName,
        credentials: account.credentials,
    };
}


function deserializeUser(username: string, token: string, data: string) {
    var structure: SerializedUserData = JSON.parse(data);
    var ret = new UserImpl();
    ret.username = username;
    ret.token = token;
    ret.accounts = _.map(structure.accounts, deserializeExchangeAccount);
    return ret;
}

function deserializeExchangeAccount(structure: SerializedExchangeAccount) {
    return {
        id: structure.id,
        exchange: markets.deserializeExchange(structure.exchange),
        shortName: structure.shortName,
        credentials: structure.credentials,
    };
}


export var currentUser: User;
export var userChanged = new Signal();

export function init() {
    var token = localStorage.getItem("auth.token");
    if (!token) {
        setUser(null);
        return $.Deferred().resolve();
    }
    return checkToken(token).then((data: LoginResponse) => {
        setUser(deserializeUser(data.response.username, token, data.response.data));
    }, () => {
        setUser(null);
    });
}

function setUser(user: User) {
    log.info("Setting user to " + (user ? "username=" + user.username : "null"));
    currentUser = user || new UserImpl();
    userChanged.emit();
}

function storeUserToken() {
    localStorage.setItem("auth.token", currentUser.token);
}

function forgetUserToken() {
    localStorage.removeItem("auth.token");
}


export function signup(username: string, password: string) {
    return $.ajax({
        method: "POST",
        url: "/api/signup",
        data: {username: username, password: password, data: serializeUserData()},
        dataType: "json",
    }).then((data: LoginResponse) => {
        log.info("Success from /api/signup");
        currentUser.username = username;
        currentUser.token = data.response.token;
    }, () => {
        log.error("Error from /api/signup");
    });
}

export function login(username: string, password: string, remember: boolean) {
    return $.ajax({
        method: "POST",
        url: "/api/login",
        data: {username: username, password: password, data: serializeUserData()},
        dataType: "json",
    }).then((data: LoginResponse) => {
        log.info("Success from /api/login");
        setUser(deserializeUser(username, data.response.token, data.response.data));
        if (remember)
            storeUserToken();
    }, () => {
        log.error("Error from /api/login");
    });
}

function checkToken(token: string) {
    return $.ajax({
        method: "POST",
        url: "/api/check-token",
        data: {token: token},
        dataType: "json",
    }).then((data: LoginResponse) => {
        log.info("Success from /api/check-token");
        return data;
    }, (): any => {
        log.error("Error from /api/check-token");
    });
}

export function saveUserData() {
    return $.ajax({
        method: "POST",
        url: "/api/update-user-data",
        data: {token: currentUser.token, data: serializeUserData()},
        dataType: "json",
    });
}

export function logout() {
    setUser(null);
    forgetUserToken();
    return $.Deferred().resolve();
}

interface LoginResponse {
    response: {
        username: string;
        token: string;
        data: string;
    };
}
