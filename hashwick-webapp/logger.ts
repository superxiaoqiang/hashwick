import Signal = require("../lib/signal");


var TRACE = 1;
var DEBUG = 2;
var INFO = 3;
var WARNING = 4;
var ERROR = 5;

var browserLevel = 0;

export var onOutput = new Signal();

export interface LogEvent {
    timestamp: Date;
    source: string;
    level: number;
    message: string;
}

export function formatTimestamp(date: Date) {
    return /^[\d-]+T([\d:.]+)/.exec(date.toISOString())[1];
}


export class Logger {
    private source: string;

    constructor(source: string) {
        this.source = source;
    }

    private emit(level: number, message: string) {
        var timestamp = new Date();
        var output = formatTimestamp(timestamp) + " (" + level + ") [" + this.source + "] " + message;
        if (level >= browserLevel)
            if (window.console)
                console.log(output);
        onOutput.emit(<LogEvent>{timestamp: timestamp, source: this.source, level: level, message: message});
    }

    public exception(ex: any) {
        this.emit(ERROR, "exception: " + ex.message + "\n" + ex.stack);
        throw ex;
    }

    public trace = _.partial(this.emit, TRACE);
    public debug = _.partial(this.emit, DEBUG);
    public info = _.partial(this.emit, INFO);
    public warning = _.partial(this.emit, WARNING);
    public error = _.partial(this.emit, ERROR);
}
