import layoutDefs_ = require("./layoutDefs");
if (0) layoutDefs_;
import LayoutPreset = layoutDefs_.LayoutPreset;


export var builtinLayoutPresets: LayoutPreset[] = [{
    name: "Bitcoinity",
    layout: {
        markets: [{key: "0", name: "default", item: {exchange: "4", left: "BTC", right: "USD"}}],
        dataSources: [
            {key: "ohlcv", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
            {key: "depth", name: "depth", item: {type: "marketLiveDepth", market: {key: "0"}}},
            {key: "ticker", name: "ticker", item: {type: "marketLiveTicker", market: {key: "0"}}},
            {key: "trades", name: "trades", item: {type: "marketTrades", market: {key: "0"}}},
            {key: "ticks", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades"}}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
        ],
        rootPane: {
            type: "splitVert",
            children: [{
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "view",
                            view: {
                                type: "timeChart",
                                timespan: 12 * 60 * 60,
                                plots: [{
                                    heightWeight: 10,
                                    series: [{
                                        dataSource: {key: "ohlcv"},
                                        painter: {type: "candlestick"},
                                    }],
                                }],
                            },
                        },
                        sizeWeight: 1,
                    }, {
                        pane: {
                            type: "view",
                            view: {
                                type: "depthChart",
                                dataSource: {key: "depth"},
                            },
                        },
                        sizeWeight: 1,
                    }],
                },
                sizeWeight: 3,
            }, {
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "view",
                            view: {
                                type: "simpleTicker",
                                dataSource: {key: "ticker"},
                            },
                        },
                        sizeWeight: 1,
                    }, {
                        pane: {
                            type: "view",
                            view: {
                                type: "tradesScroller",
                                dataSource: {key: "ticks"},
                            },
                        },
                        sizeWeight: 3,
                    }],
                },
                sizeWeight: 1,
            }],
        },
    },
}, {
    name: "Compare 2",
    layout: {
        markets: [
            {key: "0", name: "1", item: {exchange: "1", left: "BTC", right: "USD"}},
            {key: "1", name: "2", item: {exchange: "4", left: "BTC", right: "USD"}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
            {type: "market.exchange", key: "1"},
        ],
        dataSources: [
            {key: "ohlcv0", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
            {key: "ticker0", name: "ticker", item: {type: "marketLiveTicker", market: {key: "0"}}},
            {key: "trades0", name: "trades", item: {type: "marketTrades", market: {key: "0"}}},
            {key: "ticks0", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades0"}}},
            {key: "ohlcv1", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "1"}, period: 15 * 60}},
            {key: "ticker1", name: "ticker", item: {type: "marketLiveTicker", market: {key: "1"}}},
            {key: "trades1", name: "trades", item: {type: "marketTrades", market: {key: "1"}}},
            {key: "ticks1", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades1"}}},
        ],
        rootPane: {
            type: "splitVert",
            children: [{
                pane: {
                    type: "view",
                    view: {
                        type: "timeChart",
                        timespan: 12 * 60 * 60,
                        plots: [{
                            heightWeight: 20,
                            series: [{
                                dataSource: {key: "ohlcv0"},
                                painter: {type: "candlestick"},
                            }],
                        }, {
                            heightWeight: 20,
                            series: [{
                                dataSource: {key: "ohlcv1"},
                                painter: {type: "candlestick"},
                            }],
                        }],
                    },
                },
                sizeWeight: 4,
            }, {
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "view",
                            view: {
                                type: "simpleTicker",
                                dataSource: {key: "ticker0"},
                            },
                        },
                        sizeWeight: 1,
                    }, {
                        pane: {
                            type: "view",
                            view: {
                                type: "simpleTicker",
                                dataSource: {key: "ticker1"},
                            },
                        },
                        sizeWeight: 1,
                    }],
                },
                sizeWeight: 1,
            }],
        },
    },
}, {
    name: "Wide Compare 3",
    layout: {
        markets: [
            {key: "0", name: "1", item: {exchange: "1", left: "BTC", right: "USD"}},
            {key: "1", name: "2", item: {exchange: "4", left: "BTC", right: "USD"}},
            {key: "2", name: "3", item: {exchange: "5", left: "BTC", right: "USD"}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
            {type: "market.exchange", key: "1"},
            {type: "market.exchange", key: "2"},
        ],
        dataSources: [
            {key: "ohlcv0", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
            {key: "depth0", name: "depth", item: {type: "marketLiveDepth", market: {key: "0"}}},
            {key: "ticker0", name: "ticker", item: {type: "marketLiveTicker", market: {key: "0"}}},
            {key: "trades0", name: "trades", item: {type: "marketTrades", market: {key: "0"}}},
            {key: "ticks0", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades0"}}},
            {key: "ohlcv1", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "1"}, period: 15 * 60}},
            {key: "depth1", name: "depth", item: {type: "marketLiveDepth", market: {key: "1"}}},
            {key: "ticker1", name: "ticker", item: {type: "marketLiveTicker", market: {key: "1"}}},
            {key: "trades1", name: "trades", item: {type: "marketTrades", market: {key: "1"}}},
            {key: "ticks1", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades1"}}},
            {key: "ohlcv2", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "2"}, period: 15 * 60}},
            {key: "depth2", name: "depth", item: {type: "marketLiveDepth", market: {key: "2"}}},
            {key: "ticker2", name: "ticker", item: {type: "marketLiveTicker", market: {key: "2"}}},
            {key: "trades2", name: "trades", item: {type: "marketTrades", market: {key: "2"}}},
            {key: "ticks2", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades2"}}},
        ],
        rootPane: {
            type: "splitVert",
            children: [{
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "view",
                            view: {
                                type: "timeChart",
                                timespan: 12 * 60 * 60,
                                plots: [{
                                    heightWeight: 20,
                                    series: [{
                                        dataSource: {key: "ohlcv0"},
                                        painter: {type: "candlestick"},
                                    }],
                                }, {
                                    heightWeight: 20,
                                    series: [{
                                        dataSource: {key: "ohlcv1"},
                                        painter: {type: "candlestick"},
                                    }],
                                }, {
                                    heightWeight: 20,
                                    series: [{
                                        dataSource: {key: "ohlcv2"},
                                        painter: {type: "candlestick"},
                                    }],
                                }],
                            },
                        },
                        sizeWeight: 2,
                    }, {
                        pane: {
                            type: "splitVert",
                            children: [{
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "depthChart",
                                        dataSource: {key: "depth0"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "depthChart",
                                        dataSource: {key: "depth1"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "depthChart",
                                        dataSource: {key: "depth2"},
                                    },
                                },
                                sizeWeight: 1,
                            }],
                        },
                        sizeWeight: 1,
                    }],
                },
                sizeWeight: 5,
            }, {
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "splitVert",
                            children: [{
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "simpleTicker",
                                        dataSource: {key: "ticker0"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "simpleTicker",
                                        dataSource: {key: "ticker1"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "simpleTicker",
                                        dataSource: {key: "ticker2"},
                                    },
                                },
                                sizeWeight: 1,
                            }],
                        },
                        sizeWeight: 1,
                    }, {
                        pane: {
                            type: "splitVert",
                            children: [{
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "tradesScroller",
                                        dataSource: {key: "ticks0"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "tradesScroller",
                                        dataSource: {key: "ticks1"},
                                    },
                                },
                                sizeWeight: 1,
                            }, {
                                pane: {
                                    type: "view",
                                    view: {
                                        type: "tradesScroller",
                                        dataSource: {key: "ticks2"},
                                    },
                                },
                                sizeWeight: 1,
                            }],
                        },
                        sizeWeight: 3,
                    }],
                },
                sizeWeight: 3,
            }],
        },
    },
}, {
    name: "Indicators",
    layout: {
        markets: [
            {key: "0", name: "default", item: {exchange: "1", left: "BTC", right: "USD"}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
        ],
        dataSources: [
            {key: "ohlcv", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
            {key: "ticker", name: "ticker", item: {type: "marketLiveTicker", market: {key: "0"}}},
            {key: "trades", name: "trades", item: {type: "marketTrades", market: {key: "0"}}},
            {key: "ticks", name: "ticks", item: {type: "tradesToTicks", dataSource: {key: "trades"}}},
        ],
        rootPane: {
            type: "splitVert",
            children: [{
                pane: {
                    type: "view",
                    view: {
                        type: "timeChart",
                        timespan: 12 * 60 * 60,
                        plots: [{
                            heightWeight: 15,
                            series: [{
                                dataSource: {key: "ohlcv"},
                                painter: {type: "candlestick"},
                            }],
                        }, {
                            heightWeight: 5,
                            series: [{
                                dataSource: {key: "ohlcv"},
                                painter: {type: "volumeBars"},
                            }],
                        }],
                    },
                },
                sizeWeight: 3,
            }, {
                pane: {
                    type: "splitHorz",
                    children: [{
                        pane: {
                            type: "view",
                            view: {
                                type: "simpleTicker",
                                dataSource: {key: "ticker"},
                            },
                        },
                        sizeWeight: 1,
                    }, {
                        pane: {
                            type: "view",
                            view: {
                                type: "tradesScroller",
                                dataSource: {key: "ticks"},
                            },
                        },
                        sizeWeight: 3,
                    }],
                },
                sizeWeight: 1,
            }],
        },
    },
}, {
    name: "Giant candles",
    layout: {
        markets: [{key: "0", name: "default", item: {exchange: "4", left: "BTC", right: "USD"}}],
        dataSources: [
            {key: "ohlcv", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
        ],
        rootPane: {
            type: "view",
            view: {
                type: "timeChart",
                timespan: 12 * 60 * 60,
                plots: [{
                    heightWeight: 20,
                    series: [{
                        dataSource: {key: "ohlcv"},
                        painter: {type: "candlestick"},
                    }],
                }],
            },
        },
    },
}, {
    name: "Candles + console",
    layout: {
        markets: [{key: "0", name: "default", item: {exchange: "4", left: "BTC", right: "USD"}}],
        dataSources: [
            {key: "ohlcv", name: "ohlcv", item: {type: "marketOHLCV", market: {key: "0"}, period: 15 * 60}},
        ],
        knobs: [
            {type: "market.exchange", key: "0"},
        ],
        rootPane: {
            type: "splitHorz",
            children: [{
                pane: {
                    type: "view",
                    view: {
                        type: "timeChart",
                        timespan: 12 * 60 * 60,
                        plots: [{
                            heightWeight: 20,
                            series: [{
                                dataSource: {key: "ohlcv"},
                                painter: {type: "candlestick"},
                            }],
                        }],
                    },
                },
                sizeWeight: 2,
            }, {
                pane: {
                    type: "view",
                    view: {type: "console"},
                },
                sizeWeight: 1,
            }],
        },
    },
}];

export var defaultLayout = builtinLayoutPresets[0].layout;
