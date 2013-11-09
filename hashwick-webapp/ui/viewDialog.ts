import serialization = require("../views/serialization");
import view_ = require("../views/view");
import View = view_.View;
import views = require("../views/views");
import Dialog = require("../widgets/dialog");


class ViewDialog {
    private dialog: Dialog;
    private deferred = $.Deferred();

    constructor() {
        this.dialog = new Dialog("Choose a View");
        this.dialog.footer
            .append($('<button type="button" class="btn btn-default">Cancel</button>')
                .on("click", () => { this.dismiss(); }));

        _.each(viewGallery, item => {
            this.dialog.content.append($('<div class="thumbnail clickable">')
                .append($('<div class="caption"></div>')
                    .append($("<h3>").text(item.name))
                    .append($("<p>").text(item.description)))
                .on("click", this.chooseView.bind(this, item)));
        });
    }

    public show() {
        this.dialog.show();
        return this.deferred;
    }

    public dismiss() {
        this.dialog.dismiss();
        this.deferred.resolve();
    }

    private chooseView(item: ViewGalleryItem) {
        this.dialog.dismiss();
        var viewClass = serialization.viewClasses[item.class];
        var view = {type: item.class};  // TODO: define and use a proper interface for
                                        // creating the default state of a view
        this.deferred.resolve(view);
    }
}


interface ViewGalleryItem {
    name: string;
    class: string;
    description: string;
}

var viewGallery: ViewGalleryItem[] = [/*{
    name: "Ticker",
    class: "simpleTicker",
    description: "A simple ticker with last, bid, and ask",
}, {
    name: "Trades Scroller",
    class: "tradesScroller",
    description: "Display individual trades as they happen",
}, {
    name: "Depth Chart",
    class: "depthChart",
    description: "Show the bid-ask curve",
},*/ {
    name: "Console",
    class: "console",
    description: "Log output for geeks",
}];


export = ViewDialog;
