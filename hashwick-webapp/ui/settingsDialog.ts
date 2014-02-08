import fun = require("../../lib/fun");
import user = require("../user");
import markets = require("../data/markets");
import ExchangeCredential = markets.ExchangeCredential;
import accounts_ = require("../data/connect/accounts");
if (0) accounts_;
import AccountLivePortfolioDataSource = accounts_.AccountLivePortfolioDataSource;
import math = require("../utils/math");
import strings = require("../utils/strings");
import Dialog = require("../widgets/dialog");
import dom = require("../widgets/dom");
import fx = require("../widgets/fx");
import SelectorBar = require("../widgets/selectorBar");


class SettingsDialogImpl {
    private dialog = new Dialog("Settings");
    public tabs: SelectorBar;
    private pages: Page[];
    private currentPage: Page;

    constructor() {
        this.tabs = new SelectorBar("nav-tabs");
        this.tabs.selectionChanged.attach(this.tabChanged);

        this.dialog.content.append(this.tabs.element);
        this.dialog.footer.append($('<button type="button" class="btn btn-default">Close</button>')
            .on("click", this.dialog.dismiss));

        this.pages = [new ExchangeAccountsPage(this), new UserPage(this)];
        _.each(this.pages, page => {
            this.tabs.addItem(page.title);
        });
        this.tabs.setSelectedValue(this.pages[0].title);
    }

    public show() {
        this.dialog.show();
    }

    public dismiss = () => {
        user.saveUserData().then(() => {
            _.each(this.pages, page => {
                page.destroy();
            });
            this.dialog.dismiss();
        }).catch(() => {
            // TODO: display error message
        });
    };

    private tabChanged = () => {
        var title = this.tabs.getSelectedValue();
        this.setPage(this.getPageByTitle(title));
    };

    private getPageByTitle(title: string) {
        return _.findWhere(this.pages, {title: title});
    }

    public setPage(page: Page, animation?: string) {
        page.refresh();
        if (!this.currentPage || !animation) {
            if (this.currentPage)
                this.currentPage.bodyElement.detach();
            this.tabs.element.after(page.bodyElement);
        } else if (animation === "slideLeft") {
            fx.slideReplaceHorz(this.currentPage.bodyElement, page.bodyElement, true);
        } else if (animation === "slideRight") {
            fx.slideReplaceHorz(this.currentPage.bodyElement, page.bodyElement);
        } else
            throw 0;
        this.currentPage = page;
    }
}

interface Page {
    title: string;
    bodyElement: JQuery;

    destroy(): void;
    refresh(): void;
}

class ExchangeAccountsPage {
    public title = "Accounts";
    public bodyElement: JQuery;
    private dialog: SettingsDialogImpl;
    private accountsList: JQuery;
    private newPage: AddExchangeAccountPage;

    constructor(dialog: SettingsDialogImpl) {
        this.dialog = dialog;
        this.newPage = new AddExchangeAccountPage(this.dialog, this);

        this.bodyElement = $("<div>")
            .append(this.accountsList = $('<table class="table"></table>'))
            .append($('<button type="button" class="btn btn-primary">Add account</button>')
                .on("click", this.addAccount));
    }

    public destroy() { }

    public refresh() {
        this.accountsList.empty();
        if (!user.currentUser.accounts.length) {
            this.accountsList.html('<tr><td class="text-muted">[ no accounts added ]</td></tr>');
        } else {
            this.accountsList.append('<tr><th>Exchange</th><th>Short Name</th><th></th></tr>');
            _.each(user.currentUser.accounts, account => {
                this.accountsList.append($("<tr>")
                    .append($("<td>").text(account.exchange.name))
                    .append($("<td>").text(account.shortName))
                    .append($('<td class="table-buttons-cell"></td>')
                        .append($('<button type="button" class="btn btn-sm btn-default">Info</button>')
                            .on("click", this.info))
                        .append(" ")
                        .append($('<button type="button" class="btn btn-sm btn-default">Edit</button>')
                            .on("click", this.edit))
                        .append(" ")
                        .append($('<button type="button" class="btn btn-sm btn-danger">Delete</button>')
                            .on("click", this.delete))));
            });
        }
    }

    private addAccount = (event: Event) => {
        this.newPage.activate("add");
    };

    private accountFromElement(element: JQuery) {
        var accountIndex = $(element).closest("tr").index() - 1;  // `- 1` for header row
        return user.currentUser.accounts[accountIndex];
    }

    private info = (event: Event) => {
        var account = this.accountFromElement($(event.target));
        var dialog = new Dialog("Account");
        var assetList: JQuery;

        dialog.content
            .append("<h3>Portfolio</h3>")
            .append(assetList = $('<table class="table table-condensed table-hover"></table>')
                .append('<tr><th>Asset</th><th>Balance</th></tr>')
                .append('<tr><td colspan="2">Loading&hellip;</td></tr></table>'));
        dialog.footer.append($('<button type="button" class="btn btn-default">Close</button>')
            .on("click", dialog.dismiss.bind(dialog)));
        dialog.show();

        var data = AccountLivePortfolioDataSource.get(account);
        data.prefetch().then(() => {
            var portfolio = data.getFromMemory().data;
            assetList.find("tr").not(":first-child").remove();
            _.each(portfolio.assets, (balance, asset) => {
                assetList.append($("<tr>")
                    .append($("<td>").text(asset))
                    .append($("<td>").text(math.roundNumber(balance.total, 4))));
            })
        }).catch(() => {
            assetList.html("<li>Error loading portfolio</li>");
        });
    };

    private edit = (event: Event) => {
        var account = this.accountFromElement($(event.target));
        this.newPage.activate("edit", account);
    };

    private delete = (event: Event) => {
        $(event.target).text("TODO");
    };
}

class AddExchangeAccountPage {
    public title = "Add Exchange";
    public bodyElement: JQuery;
    private dialog: SettingsDialogImpl;
    private parentPage: ExchangeAccountsPage;
    private mode: string;
    private editingAccount: user.ExchangeAccount;
    private exchanges: SelectorBar;
    private noSelMessage: JQuery;
    private form: JQuery;
    private shortName: JQuery;
    private credentialsLink: JQuery;
    private accountFields: JQuery;
    private saveButton: JQuery;

    constructor(dialog: SettingsDialogImpl, parentPage: ExchangeAccountsPage) {
        this.dialog = dialog;
        this.parentPage = parentPage;

        this.exchanges = new SelectorBar("nav-pills nav-stacked");
        this.exchanges.selectionChanged.attach(this.exchangeSelected);
        _.each(markets.exchanges, exchange => {
            this.exchanges.addItem(exchange.id.toString(), exchange.name);
        });

        this.bodyElement = $('<div class="row"></div>')
            .append($('<div class="col-sm-3"></div>').append(this.exchanges.element))
            .append(this.noSelMessage = $('<div class="col-sm-9 well"></div>')
                .text("Please select an exchange."))
            .append(this.form = $('<form class="col-sm-9 form-horizontal"></form>')
                .append("<h3>Name</h3>")
                .append(dom.makeFormRow("col-sm-3", "col-sm-9", "Short Name",
                    this.shortName = $('<input class="form-control">')))
                .append("<h3>Credentials</h3>")
                .append($("<p>")
                    .text("These credentials allow you to make trades and analyze history using our interface." +
                          " Credentials can be created and managed on ")
                    .append(this.credentialsLink = $('<a target="_blank"></a>'))
                    .append(". Remember to mind your permissions."))
                .append(this.accountFields = $("<div>"))
                .append($("<div>")
                    .append(this.saveButton = $('<button type="button" class="btn btn-lg btn-primary"></button>')
                        .on("click", this.ok))
                    .append($('<button type="button" class="btn btn-link">Cancel</button>')
                        .on("click", this.cancel))));
    }

    public destroy() { }

    public refresh() { }

    public activate(mode: string, account?: user.ExchangeAccount) {
        this.mode = mode;
        this.editingAccount = account;

        if (this.mode === "add") {
            this.exchanges.setSelectedValue(null);
            this.saveButton.html('<span class="glyphicon glyphicon-plus"></span> Add');
        } else {
            this.exchanges.setSelectedValue(account.exchange.id.toString());
            this.shortName.val(account.shortName);
            _.each(this.credentialFields(), fun.splat((credential: ExchangeCredential, field: JQuery) => {
                field.val(account.credentials[credential.key]);
            }));
            this.saveButton.html('<span class="glyphicon glyphicon-ok"></span> Save');
        }
        this.dialog.setPage(this, "slideLeft");
    }

    private getSelectedExchange() {
        return markets.exchanges[this.exchanges.getSelectedValue()];
    }

    private credentialFields() {
        var exchange = this.getSelectedExchange();
        return _.map(exchange.credentials, credential => {
            var field = this.accountFields.find("input").filter(function () {
                return this.getAttribute("name") === credential.key;
            });
            return [credential, field];
        })
    }

    private exchangeSelected = () => {
        var exchange = this.getSelectedExchange();
        if (!exchange) {
            this.noSelMessage.show();
            this.form.hide();
            return;
        }

        this.noSelMessage.hide();
        this.form.show();

        this.shortName.val(exchange.defaultShortName);
        this.credentialsLink.attr("href", exchange.credentialsURL).text(exchange.name + "'s website");
        this.accountFields.empty();
        _.each(exchange.credentials, credential => {
            this.accountFields
                .append(dom.makeFormRow("col-sm-3", "col-sm-9", credential.label,
                    $('<input class="form-control">').attr("name", credential.key)));
        });
    };

    private cancel = () => {
        this.dialog.setPage(this.parentPage, "slideRight");
    };

    private ok = () => {
        var exchange = this.getSelectedExchange();
        var shortName = this.shortName.val();
        var credentials = <{ [name: string]: string; }>
                            _.object(_.map(this.credentialFields(),
                                           fun.splat((c: ExchangeCredential, f: JQuery)
                                                            => [c.key, f.val()])));
        if (this.mode === "add") {
            user.currentUser.accounts.push({
                id: strings.randomGibberish(),
                exchange: exchange,
                shortName: shortName,
                credentials: credentials,
            });
        } else {
            _.extend(this.editingAccount, {
                exchange: exchange,
                shortName: shortName,
                credentials: credentials,
            });
        }

        user.saveUserData().then(() => {
            this.dialog.setPage(this.parentPage, "slideRight");
        }).catch(() => {
            // TODO: display error message
        });
    };
}

class UserPage {
    public title = "User";
    public bodyElement: JQuery;
    private dialog: SettingsDialogImpl;
    private tabs: SelectorBar;
    private pageContainer: JQuery;
    private pages: { [title: string]: JQuery };

    constructor(dialog: SettingsDialogImpl) {
        this.dialog = dialog;

        this.tabs = new SelectorBar("nav-pills nav-stacked");
        this.tabs.selectionChanged.attach(this.tabChanged);

        this.bodyElement = $('<div class="row"></div>')
            .append($('<div class="col-sm-3"></div>').append(this.tabs.element))
            .append(this.pageContainer = $('<div class="col-sm-9"></div>'));

        user.userChanged.attach(this.refresh);
    }

    public destroy() {
        user.userChanged.detach(this.refresh);
    }

    public refresh = () => {
        this.tabs.clearItems();
        this.pages = {};

        if (!user.currentUser.username) {
            this.pages["Sign up"] = $('<form class="form-horizontal">')
                .append("<h3>Sign up</h3>")
                .append(dom.makeFormRow("col-xs-3", "col-xs-9", "Username",
                    $('<input class="form-control" name="username">')))
                .append(dom.makeFormRow("col-xs-3", "col-xs-9", "Password",
                    $('<input class="form-control" type="password" name="password">')))
                .append($('<div class="form-group"></div>')
                    .append($('<div class="col-xs-offset-3 col-xs-9"></div>')
                        .append($('<button type="button" class="btn btn-lg btn-primary">' +
                                  '<span class="glyphicon glyphicon-ok"></span> Sign up</button>')
                            .on("click", this.signup))));

            this.pages["Log in"] = $('<form class="form-horizontal">')
                .append("<h3>Log in</h3>")
                .append(dom.makeFormRow("col-xs-3", "col-xs-9", "Username",
                    $('<input class="form-control" name="username">')))
                .append(dom.makeFormRow("col-xs-3", "col-xs-9", "Password",
                    $('<input class="form-control" type="password" name="password">')))
                .append(dom.makeCheckboxRow("col-xs-offset-3 col-xs-9", "Remember Me",
                    $('<input type="checkbox" name="remember" checked>')))
                .append($('<div class="form-group"></div>')
                    .append($('<div class="col-xs-offset-3 col-xs-9"></div>')
                        .append($('<button type="button" class="btn btn-lg btn-primary">' +
                                  '<span class="glyphicon glyphicon-ok"></span> Log in</button>')
                            .on("click", this.login))));

            this.tabs.addItem("Sign up");
            this.tabs.addItem("Log in");
            this.tabs.setSelectedValue("Sign up");
        } else {
            this.pages["Log out"] = $("<div>")
                .append($('<div class="well"></div>')
                    .text("You are logged in as ")
                    .append($("<i>").text(user.currentUser.username))
                    .append("."))
                .append($('<button type="button" class="btn btn-lg btn-danger">' +
                              '<span class="glyphicon glyphicon-remove"></span> Log out</button>')
                    .on("click", this.logout));

            this.tabs.addItem("Log out");
            this.tabs.setSelectedValue("Log out");
        }
    };

    private tabChanged = () => {
        this.pageContainer.children().hide();
        this.pageContainer.append(this.pages[this.tabs.getSelectedValue()].show());
    };

    private signup = (event: Event) => {
        event.preventDefault();
        var username = $(event.target).closest("form").find("input[name=username]").val();
        var password = $(event.target).closest("form").find("input[name=password]").val();
        user.signup(username, password).catch(() => {
            // TODO: display error message
        });
    };

    private login = (event: Event) => {
        event.preventDefault();
        var username = $(event.target).closest("form").find("input[name=username]").val();
        var password = $(event.target).closest("form").find("input[name=password]").val();
        var remember = $(event.target).closest("form").find("input[name=remember]").prop("checked");
        user.login(username, password, remember).catch(() => {
            // TODO: display error message
        });
    };

    private logout = (event: Event) => {
        event.preventDefault();
        user.logout().catch(() => {
            // TODO: display error message
        });
    };
}


var SettingsDialog: { new(): { show(): void; }; } = SettingsDialogImpl;
export = SettingsDialog;
