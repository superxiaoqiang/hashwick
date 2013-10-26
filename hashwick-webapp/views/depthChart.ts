import logger_ = require("../logger");
if (0) logger_;
import Logger = logger_.Logger;
import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import interfaces_ = require("../data/interfaces");
if (0) interfaces_;
import SerializedDataSource = interfaces_.SerializedDataSource;
import LiveDepthDataSource = interfaces_.LiveDepthDataSource;
import models_ = require("../data/models");
if (0) models_;
import DepthData = models_.DepthData;
import DepthDataPoint = models_.DepthDataPoint;
import axes = require("../utils/axes");
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import geometry_ = require("../utils/geometry");
if (0) geometry_;
import Rectangle = geometry_.Rectangle;
import math = require("../utils/math");
import serialization = require("./serialization");
import view_ = require("./view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


var minDepthInfoHeight = 16;

class DepthChartView implements View {
    public static type = "depthChart";

    public viewElement: JQuery;
    private log: Logger;
    private svg: D3.Selection;
    private infoDiv: JQuery;
    private dataSource: Capsule<LiveDepthDataSource>;
    private spreadWidth: number;
    private tickSize = 8;

    public static deserialize(context: DeserializationContext, structure: SerializedDepthChartView,
                              uiContext: ViewUIContext): DepthChartView {
        var ret = new DepthChartView(uiContext);
        ret.dataSource = <Capsule<LiveDepthDataSource>>context.unsealDataSource(structure.dataSource);
        ret.dataSource.item.gotData.attach(ret.doLayout);
        ret.dataSource.item.wantRealtime();
        ret.dataSource.item.prefetch();
        ret.spreadWidth = structure.spreadWidth || 0.1;
        return ret;
    }

    constructor(uiContext: ViewUIContext) {
        uiContext.setTitle("Depth");
        this.viewElement = $('<div class="view"></div>');
        this.svg = d3.select(this.viewElement[0])
            .append("svg").attr("class", "chart")
            .append("g").attr("transform", "translate(-0.5 -0.5)");
        this.infoDiv = $('<div class="depth-chart-info-container"></div>').appendTo(this.viewElement);
        this.log = new Logger("Views.DepthChart");
    }

    public serialize(context: SerializationContext): SerializedDepthChartView {
        return {
            type: DepthChartView.type,
            dataSource: context.sealDataSource(this.dataSource),
            spreadWidth: this.spreadWidth,
        };
    }

    public destroy() {
        this.dataSource.item.unwantRealtime();
        this.dataSource.item.gotData.detach(this.doLayout);
    }

    public doLayout = () => {
        this.log.trace("redrawing chart");

        var data = this.dataSource.item.getFromMemory();
        if (!data)
            return;
        var depth = data.data;
        if (!depth.bids.length || !depth.asks.length)
            return;

        var pos = this.getPlotSize();

        var xMid = (depth.bids[0].price + depth.asks[0].price) / 2;
        var xLow = xMid * (1 - this.spreadWidth);
        var xHigh = xMid * (1 + this.spreadWidth);
        var xScale = d3.scale.linear().domain([xLow, xHigh]).range([0, pos.width]);

        var analysis = this.analyzeDepth(depth, xLow, xHigh);
        var yMax = analysis.bids.total > analysis.asks.total ? analysis.bids.total : analysis.asks.total;
        var yScale = d3.scale.linear().domain([0, yMax]).range([pos.height, 0]);

        $(this.svg.node()).empty();
        this.infoDiv.empty().css(pos);

        var plot = this.svg.append("g").attr("transform", "translate(" + pos.left + "," + pos.top + ")");

        var bidsPath = this.makeCumulativePath(depth.bids, xLow, xHigh, yMax, xScale, yScale);
        var asksPath = this.makeCumulativePath(depth.asks, xLow, xHigh, yMax, xScale, yScale);

        plot.append("path").attr({d: bidsPath, class: "depth bids"});
        plot.append("path").attr({d: asksPath, class: "depth asks"});

        this.drawXAxis(pos, xScale, depth.bids[0].price, depth.asks[0].price);
        this.drawYAxis(pos, yScale);

        plot.append("line").attr({class: "axis", x1: 0, y1: 0, x2: 0, y2: pos.height});
        plot.append("line").attr({class: "axis", x1: 0, y1: pos.height, x2: pos.width, y2: pos.height});

        var minWall = yScale.invert(0) - yScale.invert(minDepthInfoHeight);
        _.each(analysis.bids.walls, wall => {
            if (wall.amount > minWall)
                this.showWallBox(wall, true, pos, xScale, yScale);
        });
        _.each(analysis.asks.walls, wall => {
            if (wall.amount > minWall)
                this.showWallBox(wall, false, pos, xScale, yScale);
        });
    };

    private getPlotSize() {
        var width = this.viewElement.width();
        var height = this.viewElement.height();
        return {
            left: 60,
            top: 25,
            width: width - 60 - 20,
            height: height - 25 - 35,
        };
    }

    private analyzeDepth(data: DepthData, xMin: number, xMax: number) {
        return {
            bids: this.analyzeSide(data.bids, xMin, xMax),
            asks: this.analyzeSide(data.asks, xMin, xMax),
        };
    }

    private analyzeSide(data: DepthDataPoint[], xMin: number, xMax: number) {
        var total = 0;
        var walls: { [price: string]: Wall; } = {};
        for (var d = 0, dlen = data.length; d < dlen; ++d) {
            var datum = data[d];
            if (xMin <= datum.price && datum.price <= xMax) {
                total += datum.amount;
                var rounded = math.roundNumber(datum.price, 2);
                var wall = walls[rounded.toString()] || (walls[rounded.toString()] = new Wall(rounded, 0, 0));
                wall.amount += datum.amount;
                wall.total = total;
            }
        }
        var bigWalls = this.findSmallestish(_.values(walls), w => -w.amount, 1, 0.75, total * 0.02);
        return {total: total, walls: bigWalls};
    }

    private findSmallestish<T>(xs: T[], keyer: (x: T) => number,
                               minResults: number, leeway: number, threshold: number) {
        var ret = _.sortBy(xs, keyer);
        threshold = Math.max(-threshold, keyer(ret[minResults - 1]) * leeway);
        for (var xi = minResults, xlen = xs.length; xi < xlen; ++xi) {
            var x = ret[xi];
            var key = keyer(x);
            if (key > threshold)
                break;
        }
        return ret.slice(0, xi);
    }

    private makeCumulativePath(data: DepthDataPoint[], xMin: number, xMax: number, yMax: number,
                               xScale: D3.Scale.Scale, yScale: D3.Scale.Scale) {
        var points: string[] = [];
        var total = 0;
        var lastY = yScale(0);
        for (var d = 0, dlen = data.length; d < dlen; ++d) {
            var datum = data[d];
            if (xMin <= datum.price && datum.price <= xMax) {
                total += datum.amount;
                if (total > yMax)
                    break;
                points.push(xScale(datum.price) + "," + lastY);
                lastY = yScale(total)
                points.push(xScale(datum.price) + "," + lastY);
            }
        }
        return "M" + points.join("L");
    }

    private drawXAxis(pos: Rectangle, xScale: D3.Scale.QuantitiveScale, bid: number, ask: number) {
        var xTicks = axes.makeXTicks(xScale);
        //var midpoint = (bid + ask) / 2;
        //xTicks.push(midpoint);

        var xGrid = this.svg.selectAll(null)
            .data(xTicks)
            .enter().append("g")
            .attr("transform", (t: any) => {
                return "translate(" + (pos.left + xScale(t)) + "," + (pos.top + pos.height) + ")";
            });

        xGrid.append("line")
            .attr({class: "tickmark", x1: 0, y1: 0, x2: 0, y2: this.tickSize});
        xGrid.append("text")
            .text(axes.scaleFormatter(xTicks))
            .attr({class: "gridline-label", "text-anchor": "middle", transform: "translate(0,24)"});
    }

    private drawYAxis(pos: Rectangle, yScale: D3.Scale.QuantitiveScale) {
        var ticks = axes.makeYTicks(yScale);
        var grid = this.svg.selectAll(null)
            .data(ticks)
            .enter().append("g")
            .attr("transform", (t: any) => "translate(" + pos.left + "," + (pos.top + yScale(t)) + ")");

        grid.append("line")
            .attr({class: "tickmark", x1: 0, y1: 0, x2: -this.tickSize, y2: 0});
        grid.append("text")
            .text(axes.scaleFormatter(ticks))
            .attr({class: "gridline-label", "text-anchor": "end", transform: "translate(-" + (this.tickSize + 2) + ",6)"});
    }

    private showWallBox(wall: Wall, bid: boolean, plot: Rectangle,
                        xScale: D3.Scale.QuantitiveScale, yScale: D3.Scale.QuantitiveScale) {
        var margin = 4;
        var cutoff = plot.width * (bid ? 1/4 : 3/4);
        var align = xScale(wall.price) > cutoff ? "right" : "left";
        var css: any = {top: yScale(wall.total)};
        var html: string;
        if (align === "left") {
            css.left = xScale(wall.price) + margin;
            html = math.roundNumber(wall.amount) + ' <span class="text-muted">(' + math.roundNumber(wall.price, 4) + ")</span>";
        } else {
            css.right = plot.width - xScale(wall.price) + margin;
            html = '<span class="text-muted">(' + math.roundNumber(wall.price, 4) + ")</span> " + math.roundNumber(wall.amount);
        }
        this.infoDiv.append($('<div class="wall-infobox"></div>').css(css).html(html));
    }
}

class Wall {
    public price: number;
    public amount: number;
    public total: number;

    constructor(price: number, amount: number, total: number) {
        this.price = price;
        this.amount = amount;
        this.total = total;
    }
}

interface SerializedDepthChartView extends SerializedView {
    dataSource: CapsuleRef<SerializedDataSource>;
    spreadWidth: number;
}


serialization.viewClasses[DepthChartView.type] = DepthChartView;
