import config = require("../config");
import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import interfaces_ = require("../data/interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import markets = require("../data/markets");
if (0) markets;
import Exchange = markets.Exchange;
import SerializedMarket = markets.SerializedMarket;
import PopupMenu = require("../widgets/popupMenu");
import layoutDefs_ = require("./layoutDefs");
if (0) layoutDefs_;
import Layout = layoutDefs_.Layout;
import SerializedLayout = layoutDefs_.SerializedLayout;
import LayoutPreset = layoutDefs_.LayoutPreset;
import SerializedLayoutKnob = layoutDefs_.SerializedLayoutKnob;
import LayoutEditor = require("./layoutEditor");
import layoutPresets = require("./layoutPresets");
import paneDefs_ = require("./paneDefs");
import Pane = paneDefs_.Pane;
import SerializedPane = paneDefs_.SerializedPane;
import panes_ = require("./panes");
if (0) panes_;
import deserializePane = panes_.deserializePane;


var canvas = $("main");
var curLayout: Layout;

$(window).on("resize", function () {
    curLayout.rootPane.doLayout();
});

export function setLayout(structure: SerializedLayout) {
    if (curLayout && curLayout.rootPane)
        curLayout.rootPane.destroy();
    if (!structure)
        structure = layoutPresets.defaultLayout;
    var context = new DeserializationContext(structure.markets, structure.dataSources);
    var rootPane = deserializePane(context, structure.rootPane);
    canvas.html(rootPane.paneElement);
    rootPane.doLayout();
    showKnobs(context, structure.knobs);
    curLayout = {
        rootPane: rootPane,
        knobs: structure.knobs,
    };
}

function setTheme(url: string) {
    $("link[rel=stylesheet]").attr("href", url);
}

export function serializeCurrentLayout(): SerializedLayout {
    var context = new SerializationContext();
    var rootPane = curLayout.rootPane.serialize(context);
    return {
        rootPane: rootPane,
        markets: context.marketCapsules,
        dataSources: context.dataSourceCapsules,
        knobs: curLayout.knobs,
    };
}

export function showLayoutMenu(event: Event) {
    var popup = new PopupMenu();
    popup.addItem("Edit current layout", () => new LayoutEditor(serializeCurrentLayout()).show());
    popup.addSeparator();
    _.each(layoutPresets.builtinLayoutPresets, preset => {
        popup.addItem(preset.name, () => setLayout(preset.layout));
    });
    popup.addSeparator();
    _.each(config.themes, (url, name) => {
        popup.addItem(name, () => setTheme(url));
    });
    popup.show($(event.target));
}


function showKnobs(context: DeserializationContext, knobs: SerializedLayoutKnob[]) {
    var center = $("#app-header-center").empty();
    _.each(knobs, knob => {
        var element = knobTypes[knob.type].create(context, knob);
        center.append(element);
    });
    center.css("line-height", ($("#app-header-navbar").height() / knobs.length) + "px");
}

class MarketExchangeKnob {
    public static create(context: DeserializationContext, knob: SerializedMarketExchangeKnob) {
        var list = $('<ul class="list-inline"></ul>');
        var curExchange = context.unsealMarket({key: knob.key}).item.exchange;
        _.each(markets.exchanges, exchange => {
            var item = $("<li>").append($('<a href="#"></a>')
                .text(exchange.name)
                .on("click", () => { this.setExchange(event, knob, exchange); }));
            if (exchange === curExchange)
                item.addClass("active");
            list.append(item);
        });
        return list;
    }

    private static setExchange(event: Event, knob: SerializedMarketExchangeKnob, exchange: Exchange) {
        event.preventDefault();
        var layout = serializeCurrentLayout();
        _.findWhere(layout.markets, {key: knob.key}).item.exchange = exchange.id;
        setLayout(layout);
    }
}

interface SerializedMarketExchangeKnob extends SerializedLayoutKnob {
    key: string;
}


interface LayoutKnobType {
    create(context: DeserializationContext, knob: SerializedLayoutKnob): void;
}

var knobTypes: { [type: string]: LayoutKnobType } = {
    "market.exchange": MarketExchangeKnob,
};
