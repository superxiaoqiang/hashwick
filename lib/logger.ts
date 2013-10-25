class Logger {
    constructor(private scope: string) { }

    private emit(level: number, message: string) {
        var text = "[" + this.scope + "] " + message;
        console.log(text);
    }

    public info = this.emit.bind(this, 5);
    public warning = this.emit.bind(this, 8);
}

export = Logger;
