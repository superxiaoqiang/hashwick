class Logger {
    constructor(private scope: string) { }

    private emit(level: number, message: string) {
        var when = new Date().toISOString().replace("T", " ").replace("Z", "");
        var text = when + " [" + this.scope + "] " + message;
        console.log(text);
    }

    public trace = this.emit.bind(this, 1);
    public debug = this.emit.bind(this, 2);
    public info = this.emit.bind(this, 3);
    public warning = this.emit.bind(this, 4);
    public error = this.emit.bind(this, 5);

    public attentionRequired(message: string) {
        // TODO: send me an email
        this.error(message);
    }
}

export = Logger;
