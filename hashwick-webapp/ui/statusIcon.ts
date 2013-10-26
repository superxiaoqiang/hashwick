import time = require("../utils/time");
import strings = require("../utils/strings");


export class StatusIcon {
    private title: string;
    private entries: StatusEntry[] = [];
    private secondlyInterval: number;
    public iconElement: JQuery;
    private popup: JQuery;
    private popupArrow: JQuery;
    private popupContent: JQuery;

    constructor(title: string, src: string) {
        this.title = title;
        this.iconElement = $('<img class="data-source-icon" width="24" height="24">')
            .attr("src", src)
            .on("mouseenter", this.showPopup)
            .on("mouseleave", this.hidePopup);
    }

    public logRequest(text: string): StatusEntry {
        var entry = {timestamp: time.serverNow(), text: text};
        this.pushEntry(entry);
        this.refreshPopup();
        return entry;
    }

    public logResponse(entry: StatusEntry, text: string) {
        entry.text = text;
        this.refreshPopup();
        this.updateState("active");
    }

    public logError(entry: StatusEntry) {
        this.refreshPopup();
        this.updateState("error");
    }

    public logPacket(text: string) {
        var entry = {timestamp: time.serverNow(), text: text};
        this.pushEntry(entry);
        this.refreshPopup();
        this.updateState("active");
    }

    private pushEntry(entry: StatusEntry) {
        this.entries.push(entry);
        this.entries = this.entries.slice(-5);
    }

    private updateState(state: string) {
        this.iconElement.removeClass("active");

        if (state === "active") {
            this.iconElement.addClass("active-flash");
            this.iconElement.width();  // trigger reflow to trigger css transition
            this.iconElement.addClass("active").removeClass("active-flash");
        }
    }

    private showPopup = () => {
        if (this.popup)
            return;
        this.popup = $('<div class="popover top"></div>')
            .append(this.popupArrow = $('<div class="arrow"></div>'))
            .append($('<h3 class="popover-title"></h3>').text(this.title))
            .append(this.popupContent = $('<div class="popover-content">'))
            .appendTo("body")
            .css({visibility: "hidden", display: "block"});
        this.refreshPopup();
        this.popup.css("visibility", "");
        this.secondlyInterval = setInterval(this.refreshPopup, 1000);
    };

    private hidePopup = () => {
        if (!this.popup)
            return;
        this.popup.remove();
        this.popup = null;
        clearInterval(this.secondlyInterval);
    };

    private positionPopup() {
        if (!this.popup)
            return;
        // do horizontal properties before vertical properties to prevent a
        // body scrollbar from appearing and shifting things around in weird ways
        this.popup.css({
            left: "inherit",
            right: 0,
        });
        this.popupArrow.css({
            left: this.iconElement.offset().left + this.iconElement.width() / 2 - this.popup.offset().left,
        });
        this.popup.css({
            top: this.iconElement.offset().top - this.popup.outerHeight(),
        });
    }

    private refreshPopup = () => {
        if (!this.popup)
            return;
        this.popupContent.empty();
        _.each(this.entries, entry => {
            var delta = (time.serverNow().getTime() - entry.timestamp.getTime()) / 1000;
            this.popupContent.append($("<div>")
                .text(strings.timeDiffShort(delta) + " ago \u2014 " + _.escape(entry.text)));
        });
        this.positionPopup();
    };
}

export interface StatusEntry {
    timestamp: Date;
    text: string;
}
