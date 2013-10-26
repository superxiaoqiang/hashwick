import arrays = require("./arrays");


class Signal {
    private handlers: Function[] = [];

    public attach(handler: Function) {
        this.handlers.push(handler);
    }

    public detach(handler: Function) {
        arrays.arrayRemove(this.handlers, handler);
    }

    public emit(...args: any[]) {
        for (var h = 0, hlen = this.handlers.length; h < hlen; ++h) {
            this.handlers[h].apply(null, arguments);
        }
    }
}

export = Signal;
