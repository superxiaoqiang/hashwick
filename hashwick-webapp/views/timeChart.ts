import MinMaxPair = require("../../lib/minMaxPair");
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
import TemporalDataSource = interfaces_.TemporalDataSource;
import axes = require("../utils/axes");
import capsule_ = require("../utils/capsule");
if (0) capsule_;
import Capsule = capsule_.Capsule;
import CapsuleRef = capsule_.CapsuleRef;
import eventLoop = require("../utils/eventLoop");
import time = require("../utils/time");
import dom = require("../widgets/dom");
import serialization = require("./serialization");
import timeChartPainters_ = require("./timeChartPainters");
if (0) timeChartPainters_;
import SerializedDataPainter = timeChartPainters_.SerializedDataPainter;
import TemporalDataPainter = timeChartPainters_.TemporalDataPainter;
import Predraw = timeChartPainters_.Predraw;
import deserializeDataPainter = timeChartPainters_.deserializeDataPainter;
import view_ = require("./view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


class ChartView implements View {
    public static type = "timeChart";

    public viewElement: JQuery;
    private log: Logger;
    private uiContext: ViewUIContext;
    private svg: D3.Selection;
    private plots: Plot[];
    private timespan: number;
    private presets: SerializedPreset[];
    private tickSize = 8;

    public static deserialize(context: DeserializationContext, structure: SerializedChartView,
                              uiContext: ViewUIContext): ChartView {
        var ret = new ChartView(uiContext);
        ret.timespan = structure.timespan || 6 * 60 * 60;
        ret.setPlots(context, structure.plots);
        ret.setPresets(structure.presets);
        return ret;
    }

    constructor(uiContext: ViewUIContext) {
        this.uiContext = uiContext;
        uiContext.setTitle("Chart");
        this.viewElement = $('<div class="view"></div>');
        this.svg = d3.select(this.viewElement[0])
            .append("svg").attr("class", "chart")
            .append("g").attr("transform", "translate(-0.5 -0.5)");
        this.log = new Logger("Views.TimeChart");
    }

    private clearPlots() {
        if (!this.plots || !this.plots.length)
            return;
        this.log.trace("Deactivating plots");
        _.each(this.plots, plot => {
            _.each(plot.series, series => {
                series.dataSource.item.unwantRealtime();
                series.dataSource.item.gotData.detach(this.redraw);
            })
        });
        this.plots = null;
    }

    private setPlots(context: DeserializationContext, plots: SerializedPlot[]) {
        this.log.trace("Activating plots");
        this.plots = _.map(plots, p => deserializePlot(context, p));
        _.each(this.plots, plot => {
            _.each(plot.series, series => {
                series.dataSource.item.gotData.attach(this.redraw);
                series.dataSource.item.wantRealtime();
                var latest = time.serverNow();
                var earliest = new Date(latest.getTime() - this.timespan * 1000);
                series.dataSource.item.prefetch(earliest, latest);
            })
        });
    }

    private setPresets(presets: SerializedPreset[]) {
        this.presets = presets;
        _.each(this.presets, preset => {
            this.uiContext.addButton(preset.name).on("click", event => {
                var context1 = new SerializationContext();
                var plots = _.map(this.plots, plot => plot.serialize(context1));
                _.each(plots, plot => {
                    applyChangesToSerializedPlot(plot, preset.changes);
                });

                var context2 = new DeserializationContext(
                    context1.marketCapsules, context1.dataSourceCapsules);
                this.timespan = preset.timespan;
                this.clearPlots();
                this.setPlots(context2, plots);
                this.redraw();

                event.preventDefault();
            });
        });
    }

    public serialize(context: SerializationContext): SerializedChartView {
        return {
            type: ChartView.type,
            timespan: this.timespan,
            plots: _.map(this.plots, plot => plot.serialize(context)),
            presets: this.presets,
        };
    }

    public destroy() {
        this.clearPlots();
    }

    private redraw = () => {
        eventLoop.setImmediateOnce(this.doLayout);
    };

    public doLayout = () => {
        this.log.trace("redrawing chart");
        this.calculatePlotSizes();

        var domain = this.calculateDomain();
        _.each(this.plots, plot => {
            this.measurePlot(plot, domain);
        });

        $(this.svg.node()).empty();
        _.each(this.plots, this.drawGridlines.bind(this));
        _.each(this.plots, this.drawData.bind(this));
        _.each(this.plots, this.drawAxes.bind(this));
        this.drawXAxis(domain.min, domain.max);
    };

    private calculateAllPlotsSize() {
        var width = this.viewElement.width();
        var height = this.viewElement.height();
        return {
            left: 60,
            top: 25,
            width: width - 60 - 20,
            height: height - 25 - 35,
        };
    }

    private calculatePlotSizes() {
        var all = this.calculateAllPlotsSize();

        var totalHeightWeight = _.reduce(this.plots, (a, p) => a + p.heightWeight, 0);

        var curHeightWeight = 0;
        _.each(this.plots, plot => {
            plot.left = all.left;
            plot.top = all.top + all.height * curHeightWeight / totalHeightWeight;
            plot.width = all.width;
            plot.height = all.height * plot.heightWeight / totalHeightWeight;
            curHeightWeight += plot.heightWeight;
        });
    }

    private calculateDomain() {
        var xMax = time.serverNow();
        var xMin = new Date(xMax.getTime() - this.timespan * 1000);

        var domain = new MinMaxPair(xMin, xMax);
        _.each(this.plots, plot => {
            _.each(plot.series, series => {
                domain = series.painter.adjustDomain(domain);
            });
        });

        return domain;
    }

    private drawXAxis(xMin: Date, xMax: Date) {
        var bounds = this.calculateAllPlotsSize();

        var xScale = d3.time.scale().domain([xMin, xMax]).range([0, bounds.width]);
        var xTicks = this.svg.selectAll(null)
            .data(axes.makeXTicks(xScale))
            .enter().append("g")
            .attr("transform", function (t: any) {
                return "translate(" + (bounds.left + xScale(t)) + "," + (bounds.top + bounds.height) + ")";
            });
        xTicks.append("line")
            .attr({class: "tickmark", x1: 0, y1: 0, x2: 0, y2: this.tickSize});
        xTicks.append("text")
            .attr({class: "gridline-label", "text-anchor": "middle", transform: "translate(0,24)"})
            .text(this.timeAxisTextGenerator(xTicks));
    }

    private timeAxisTextGenerator(selection: D3.Selection) {
        return function (date: Date) {
            var hr = date.getHours();
            var min = date.getMinutes();
            if (hr === 0 && min === 0) {
                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return months[date.getMonth()] + " " + date.getDate();
            }
            return hr + ":" + (min > 9 ? "" : "0") + min;
        }
    }

    private measurePlot(plot: Plot, domain: MinMaxPair<Date>) {
        plot.xMin = domain.min;
        plot.xMax = domain.max;

        var range = new MinMaxPair<number>();
        _.each(plot.series, series => {
            series.predraw = series.painter.predraw(plot.xMin, plot.xMax);
            range.grow(series.predraw.range);
        });

        plot.yScale = d3.scale.linear().domain([range.min, range.max]).range([plot.height, 0]).nice();
        var niceDomain = plot.yScale.domain();
        plot.yMin = niceDomain[0];
        plot.yMax = niceDomain[1];
    }

    private makeCanvas(plot: Plot) {
        return d3.select(dom.createSVGElement("g"))
            .attr("transform", "translate(" + plot.left + "," + plot.top + ")");
    }

    private makeYGrid(canvas: D3.Selection, plot: Plot) {
        return canvas.selectAll(null)
            .data(axes.makeYTicks(plot.yScale))
            .enter().append("g")
                .attr("transform", (t: any) => "translate(0," + plot.yScale(t) + ")");
    }

    private drawGridlines(plot: Plot) {
        var canvas = this.makeCanvas(plot);
        this.svg.node().appendChild(canvas.node());
        var yGrid = this.makeYGrid(canvas, plot);
        yGrid.append("line").attr({class: "gridline", x1: 0, y1: 0, x2: plot.width, y2: 0});
    }

    private drawData(plot: Plot) {
        var canvas = this.makeCanvas(plot);
        this.svg.node().appendChild(canvas.node());

        _.each(plot.series, series => {
            var g = series.painter.draw(plot.width, plot.height,
                plot.xMin, plot.xMax, plot.yMin, plot.yMax, series.predraw);
            canvas.node().appendChild(g.node());
        });
    }

    private drawAxes(plot: Plot) {
        var canvas = this.makeCanvas(plot);
        this.svg.node().appendChild(canvas.node());
        var yGrid = this.makeYGrid(canvas, plot);

        canvas.append("line")
            .attr({class: "axis", x1: 0, y1: 0, x2: 0, y2: plot.height});
        canvas.append("line")
            .attr({class: "axis", x1: 0, y1: plot.height, x2: plot.width, y2: plot.height});

        yGrid.append("line")
            .attr({class: "tickmark", x1: 0, y1: 0, x2: -this.tickSize, y2: 0});
        yGrid.append("text")
            .attr({class: "gridline-label", "text-anchor": "end",
                   transform: "translate(-" + (this.tickSize + 2) + ",6)"})
            .text(axes.scaleFormatter(yGrid));
    }
}


class Plot {
    heightWeight: number;
    series: Series[];
    left: number;
    top: number;
    width: number;
    height: number;
    xMin: Date;
    xMax: Date;
    yMin: number;
    yMax: number;
    yScale: D3.Scale.QuantitiveScale;

    public serialize(context: SerializationContext) {
        return {
            heightWeight: this.heightWeight,
            series: _.map(this.series, series => {
                return {
                    dataSource: context.sealDataSource(series.dataSource),
                    painter: series.painter.serialize(),
                };
            }),
        };
    }
}

class Series {
    dataSource: Capsule<TemporalDataSource<any>>;
    painter: TemporalDataPainter<number>;
    predraw: Predraw<number>;
}

interface SerializedChartView extends SerializedView {
    timespan: number;
    plots: SerializedPlot[];
    presets: SerializedPreset[];
}

interface SerializedPlot {
    heightWeight: number;
    series: SerializedSeries[];
}

interface SerializedSeries {
    dataSource: CapsuleRef<SerializedDataSource>;
    painter: SerializedDataPainter;
}

interface SerializedPreset {
    name: string;
    timespan: number;
    changes: { [key: string]: any; };
}


function deserializePlot(context: DeserializationContext, structure: SerializedPlot) {
    var ret = new Plot();
    ret.heightWeight = structure.heightWeight;
    ret.series = _.map(structure.series, series => {
        var newSeries = new Series();
        newSeries.dataSource = <Capsule<TemporalDataSource<any>>>context.unsealDataSource(series.dataSource);
        newSeries.painter = <TemporalDataPainter<number>>deserializeDataPainter(series.painter, newSeries.dataSource.item);
        return newSeries;
    });

    return ret;
}


function applyChangesToSerializedPlot(plot: SerializedPlot, changes: { [key: string]: any; }) {
    _.each(plot.series, series => {
        if ("period" in changes && "period" in series.painter)
            series.painter["period"] = changes["period"];
    });
}


serialization.viewClasses[ChartView.type] = ChartView;
