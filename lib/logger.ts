class Logger {
    constructor(private scope: string) { }

    private emit(level: number, message: string) {
        var text = "[" + this.scope + "] " + message;
        console.log(text);
    }

    public trace = this.emit.bind(this, 1);
    public debug = this.emit.bind(this, 2);
    public info = this.emit.bind(this, 3);
    public warning = this.emit.bind(this, 4);
    public error = this.emit.bind(this, 5);
}

export = Logger;
