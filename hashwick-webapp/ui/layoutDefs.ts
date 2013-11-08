import interfaces_ = require("../data/interfaces");
import SerializedDataSource = interfaces_.SerializedDataSource;
import markets_ = require("../data/markets");
import SerializedMarket = markets_.SerializedMarket;
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import paneDefs_ = require("./paneDefs");
import Pane = paneDefs_.Pane;
import SerializedPane = paneDefs_.SerializedPane;


export interface Layout {
    rootPane: Pane;
    knobs: SerializedLayoutKnob[];
}

export interface SerializedLayout {
    rootPane: SerializedPane;
    markets: Capsule<SerializedMarket>[];
    dataSources: Capsule<SerializedDataSource>[];
    knobs: SerializedLayoutKnob[];
}

export interface LayoutPreset {
    name: string;
    layout: SerializedLayout;
}

export interface SerializedLayoutKnob {
    type: string;
}
