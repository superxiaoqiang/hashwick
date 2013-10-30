import MinMaxPair = require("../../lib/minMaxPair");
import formats = require("../data/formats");
import interfaces_ = require("../data/interfaces");
if (0) interfaces_;
import DataSource = interfaces_.DataSource;
import TemporalDataSource = interfaces_.TemporalDataSource;
import OHLCVDataSource = interfaces_.OHLCVDataSource;
import models_ = require("../data/models");
if (0) models_;
import Candle = models_.Candle;
import ohlcv = require("../data/ohlcv");
import time = require("../utils/time");
import dom = require("../widgets/dom");


interface DataPainterClass {
    deserialize(structure: SerializedDataPainter, dataSource: DataSource): DataPainter;
}

export interface DataPainter {
    serialize(): SerializedDataPainter;
}

export interface TemporalDataPainter<T> extends DataPainter {
    adjustDomain(domain: MinMaxPair<Date>): MinMaxPair<Date>;
    predraw(xMin: Date, xMax: Date): Predraw<T>;
    draw(width: number, height: number, xMin: Date, xMax: Date, yMin: T, yMax: T, predraw: Predraw<T>): D3.Selection;
}

export interface Predraw<T> {
    range: MinMaxPair<T>;
}

export interface SerializedDataPainter {
    type: string;
}

var dataPainterClasses: { [type: string]: DataPainterClass } = {};

export function deserializeDataPainter(structure: SerializedDataPainter, dataSource: DataSource) {
    return dataPainterClasses[structure.type].deserialize(structure, dataSource);
}


function candleXPosition(periodLeft: number, periodRight: number) {
    // this aligns everything to exact screen pixels (hopefully)
    var periodWidth = periodRight - periodLeft;
    var margin = periodWidth / 6;
    var candleWidth = Math.ceil(periodWidth - margin * 2) & ~1;
    var candleLeft = Math.floor(periodLeft + margin);
    var candleRight = candleLeft + candleWidth;
    return [candleLeft, (candleLeft + candleRight) / 2, candleRight];
}


class CandlestickPainter implements TemporalDataPainter<number> {
    public static type = "candlestick";
    public static expectedFormat = formats.ohlcvDataFormat;

    private dataSource: OHLCVDataSource;
    private sparse: boolean;
    private vwapLine: boolean;

    public static deserialize(structure: SerializedCandlestickPainter, dataSource: OHLCVDataSource) {
        var ret = new CandlestickPainter(dataSource);
        ret.sparse = false;
        ret.vwapLine = true;
        return ret;
    }

    constructor(dataSource: OHLCVDataSource) {
        this.dataSource = dataSource;
    }

    public serialize(): SerializedCandlestickPainter {
        return {type: CandlestickPainter.type};
    }

    public adjustDomain(domain: MinMaxPair<Date>) {
        return new MinMaxPair<Date>(
            time.roundDate(domain.min, this.dataSource.period, Math.ceil),
            time.roundDate(domain.max, this.dataSource.period, Math.ceil));
    }

    public predraw(xMin: Date, xMax: Date) {
        var candles = this.dataSource.getFromMemory(xMin, xMax).data;
        var range = ohlcv.calcCandlesRange(candles);
        return {range: range, data: candles};
    }

    public draw(width: number, height: number, xMin: Date, xMax: Date, yMin: number, yMax: number, predraw: Predraw<number>) {
        var candles = (<any>predraw).data;

        var g = d3.select(dom.createSVGElement("g"));
        var xScale = d3.time.scale().domain([xMin, xMax]).range([0, width]);
        var yScale = d3.scale.linear().domain([yMin, yMax]).range([height, 0]);

        for (var c = 0, clen = candles.length; c < clen; ++c) {
            var candle = candles[c];
            var bounds = candleXPosition(xScale(candle.start), xScale(candle.end));
            var x1 = bounds[0], x2 = bounds[1], x3 = bounds[2];
            var y1 = Math.round(yScale(candle.high));
            var yopen = Math.round(yScale(candle.open));
            var yclose = Math.round(yScale(candle.close));
            var y4 = Math.round(yScale(candle.low));

            if (candle.close >= candle.open) {
                var fillClass = "hollow";
                var y2 = yclose;
                var y3 = yopen;
            } else {
                fillClass = "filled";
                y2 = yopen;
                y3 = yclose;
            }
            var dirClass = candle.close >= (lastClose || candle.open) ? "up" : "down";
            var lastClose = candle.close;

            if (this.sparse) {
                var path = "M" + x1 + "," + yopen + "L" + x2 + "," + yopen + "L" + x2 + "," + y1 + "L" + x2 + "," + y4 + "L" + x2 + "," + yclose + "L" + x3 + "," + yclose;
                fillClass = "";
            } else {
                path = "M" + x1 + "," + y2 + "L" + x2 + "," + y2 + "L" + x2 + "," + y1 + "L" + x2 + "," + y2 + "L" + x3 + "," + y2 + "L" + x3 + "," + y3 + "L" + x2 + "," + y3 + "L" + x2 + "," + y4 + "L" + x2 + "," + y3 + "L" + x1 + "," + y3 + "Z";
            }
            g.append("path").attr({class: "candlestick " + dirClass + " " + fillClass, d: path});

            if (this.vwapLine) {
                var yv = Math.round(yScale(candle.vwap));
                path = "M" + x1 + "," + yv + "," + x3 + "," + yv;
                g.append("path").attr({class: "candlestick " + dirClass, d: path});
            }
        }

        return g;
    }
}

interface SerializedCandlestickPainter extends SerializedDataPainter { }

dataPainterClasses[CandlestickPainter.type] = CandlestickPainter;


class VolumeBarsPainter implements TemporalDataPainter<number> {
    public static type = "volumeBars";
    public static expectedFormat = formats.ohlcvDataFormat;

    private dataSource: OHLCVDataSource;

    public static deserialize(structure: SerializedVolumeBarsPainter, dataSource: OHLCVDataSource) {
        var ret = new this(dataSource);
        return ret;
    }

    constructor(dataSource: OHLCVDataSource) {
        this.dataSource = dataSource;
    }

    public serialize(): SerializedVolumeBarsPainter {
        return {type: VolumeBarsPainter.type};
    }

    public adjustDomain(domain: MinMaxPair<Date>) {
        return new MinMaxPair<Date>(
            time.roundDate(domain.min, this.dataSource.period, Math.ceil),
            time.roundDate(domain.max, this.dataSource.period, Math.ceil));
    }

    public predraw(xMin: Date, xMax: Date) {
        var candles = this.dataSource.getFromMemory(xMin, xMax).data;
        var max = _.reduce<Candle, number>(candles, (max, candle) => candle.volume > max ? candle.volume : max, 0);
        var range: MinMaxPair<number> = new MinMaxPair(0, max);
        return {range: range, data: candles};
    }

    public draw(width: number, height: number, xMin: Date, xMax: Date, yMin: number, yMax: number, predraw: Predraw<number>) {
        var candles = (<any>predraw).data;

        var g = d3.select(dom.createSVGElement("g"));
        var xScale = d3.time.scale().domain([xMin, xMax]).range([0, width]);
        var yScale = d3.scale.linear().domain([yMin, yMax]).range([height, 0]);

        for (var c = 0, clen = candles.length; c < clen; ++c) {
            var candle = candles[c];
            var bounds = candleXPosition(xScale(candle.start), xScale(candle.end));
            var x1 = bounds[0], x3 = bounds[2];
            var y1 = yScale(candle.volume), y2 = yScale(0);

            var dirClass = candle.close >= candle.open ? "up hollow" : "down filled";

            var rect = g.append("rect").attr({
                class: "candlestick " + dirClass,
                x: x1, y: y1, width: x3 - x1, height: y2 - y1,
            });
        }

        return g;
    }
}

interface SerializedVolumeBarsPainter extends SerializedDataPainter { }

dataPainterClasses[VolumeBarsPainter.type] = VolumeBarsPainter;
