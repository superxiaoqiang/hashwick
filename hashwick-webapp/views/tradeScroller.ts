import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import models_ = require("../data/models");
if (0) models_;
import Trade = models_.Trade;
import interfaces_ = require("../data/interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import TemporalDataSource = interfaces_.TemporalDataSource;
import TradesDataSource = interfaces_.TradesDataSource;
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import eventLoop = require("../utils/eventLoop");
import math = require("../utils/math");
import strings = require("../utils/strings");
import time = require("../utils/time");
import serialization = require("./serialization");
import view_ = require("./view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


class TradesScrollerView implements View {
    public static type = "tradesScroller";

    public viewElement: JQuery;
    private dataSource: Capsule<TradesDataSource>;
    private counting: CountedRecentTemporalDataSource<Trade>;
    private numTrades: number;
    private table: JQuery;
    private timestampUpdateInterval: number;

    public static deserialize(context: DeserializationContext, structure: SerializedTradesScrollerView,
                              uiContext: ViewUIContext): TradesScrollerView {
        var dataSource = <Capsule<TradesDataSource>>context.unsealDataSource(structure.dataSource);
        return new TradesScrollerView(dataSource, uiContext);
    }

    constructor(dataSource: Capsule<TradesDataSource>, uiContext: ViewUIContext) {
        this.numTrades = 50;
        this.dataSource = dataSource;
        this.dataSource.item.gotData.attach(this.redraw);
        this.dataSource.item.wantRealtime();
        this.counting = new CountedRecentTemporalDataSource<Trade>(dataSource.item);
        this.counting.prefetch(this.numTrades);

        uiContext.setTitle("Trades");
        this.viewElement = $('<div class="view trade-scroller-view"></div>')
            .append(this.table = $("<div>"));
        this.timestampUpdateInterval = setInterval(this.updateTimestamps, 1000);
    }

    public serialize(context: SerializationContext): SerializedTradesScrollerView {
        return {
            type: TradesScrollerView.type,
            dataSource: context.sealDataSource(this.dataSource),
        };
    }

    public destroy() {
        this.dataSource.item.unwantRealtime();
        this.dataSource.item.gotData.detach(this.redraw);
    }

    private redraw = () => {
        eventLoop.setImmediateOnce(this.doLayout);
    };

    public doLayout = () => {
        var trades = this.counting.getFromMemory(this.numTrades);
        trades.reverse();
        var table = $('<table class="table table-condensed"></table>');
        _.each(trades, trade => {
            table.append($("<tr>")
                .addClass(trade.isBuy() ? "buy" : trade.isSell() ? "sell" : "")
                .append($("<td>").data("timestamp", trade.timestamp.getTime()))
                .append($("<td>").text(math.roundNumber(trade.price, 4)))
                .append($("<td>").text(math.roundNumber(trade.amount, 4))));
        });
        this.table.after(table).remove();
        this.table = table;
        this.updateTimestamps();
    };

    private updateTimestamps = () => {
        this.table.find("td:first-child").each(function () {
            var timestamp = $(this).data("timestamp");
            var delta = (time.serverNow().getTime() - timestamp) / 1000;
            this.textContent = strings.timeDiffVeryShort(delta);
        });
    };
}

interface SerializedTradesScrollerView extends SerializedView {
    dataSource: CapsuleRef<SerializedDataSource>;
}

serialization.viewClasses[TradesScrollerView.type] = TradesScrollerView;


class CountedRecentTemporalDataSource<T> {
    private backingDataSource: TemporalDataSource<T>;
    private fetchPeriod: number;
    private fetchIncrement: number;
    private fetchPeriodMax: number;

    constructor(backingDataSource: TemporalDataSource<T>) {
        this.backingDataSource = backingDataSource;
        this.fetchPeriod = 5 * 60 * 1000;
        this.fetchIncrement = 5 * 60 * 1000;
        this.fetchPeriodMax = 24 * 7 * 60 * 1000;
    }

    public prefetch(targetCount: number) {
        var latest = time.serverNow();
        var earliest = new Date(latest.getTime() - this.fetchPeriod);
        this.backingDataSource.prefetch(earliest, latest).then(() => {
            var curCount = this.backingDataSource.getFromMemory(earliest, latest).data.length;
            if (curCount < targetCount && this.fetchPeriod < this.fetchPeriodMax) {
                this.fetchPeriod += this.fetchIncrement;
                this.prefetch(targetCount);
            }
        });
    }

    public getFromMemory(targetCount: number) {
        var latest = time.serverNow();
        var earliest = new Date(latest.getTime() - this.fetchPeriod);
        var ret = this.backingDataSource.getFromMemory(earliest, latest);
        return ret.data.slice(-targetCount);
    }
}
