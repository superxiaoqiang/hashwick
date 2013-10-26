import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import interfaces_ = require("../data/interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import LiveTickerDataSource = interfaces_.LiveTickerDataSource;
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import strings = require("../utils/strings");
import serialization = require("./serialization");
import view_ = require("./view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


class SimpleTickerView implements View {
    public static type = "simpleTicker";

    public viewElement: JQuery;
    private dataSource: Capsule<LiveTickerDataSource>;
    private last: JQuery;
    private bid: JQuery;
    private ask: JQuery;
    private marketLabel: JQuery;

    public static deserialize(context: DeserializationContext, structure: SerializedSimpleTickerView,
                              uiContext: ViewUIContext): SimpleTickerView {
        var ret = new SimpleTickerView(uiContext);
        ret.dataSource = <Capsule<LiveTickerDataSource>>context.unsealDataSource(structure.dataSource);
        ret.dataSource.item.gotData.attach(ret.doLayout);
        ret.dataSource.item.wantRealtime();
        ret.dataSource.item.prefetch();
        return ret;
    }

    constructor(uiContext: ViewUIContext) {
        uiContext.setTitle("Ticker");
        this.viewElement = $('<div class="view simple-ticker-view">')
            .append($('<div class="text-center"></div>')
                .append(this.last = $('<div class="big-number">&mdash;</div>'))
                .append(this.marketLabel = $('<span class="market-label"></span>')))
            .append($("<div>")
                .append($('<div class="col-xs-6 text-center">')
                    .append("bid: ").append(this.bid = $('<span>&mdash;</span>')))
                .append($('<div class="col-xs-6 text-center">')
                    .append("ask: ").append(this.ask = $('<span>&mdash;</span>'))));
    }

    public serialize(context: SerializationContext): SerializedSimpleTickerView {
        return {
            type: SimpleTickerView.type,
            dataSource: context.sealDataSource(this.dataSource),
        };
    }

    public destroy() {
        this.dataSource.item.unwantRealtime();
        this.dataSource.item.gotData.detach(this.doLayout);
    }

    public doLayout = () => {
        var data = this.dataSource.item.getFromMemory();
        if (!data)
            return;

        this.last.html(strings.formatNumberFixed(data.data.last, 2));
        this.bid.html(strings.formatNumberFixed(data.data.bid, 2));
        this.ask.html(strings.formatNumberFixed(data.data.ask, 2));
        this.autosizeText(this.last);
    };

    private autosizeText(element: JQuery) {
        var targetWidth = element.innerWidth();
        element.css({position: "absolute", visibility: "hidden", fontSize: "50px"});
        var fontSize = 50 / element.innerWidth() * targetWidth;
        fontSize = fontSize > 60 ? 60 : fontSize;
        element.css({position: "", visibility: "", fontSize: fontSize});
    }
}

interface SerializedSimpleTickerView extends SerializedView {
    dataSource: CapsuleRef<SerializedDataSource>;
}


serialization.viewClasses[SimpleTickerView.type] = SimpleTickerView;
