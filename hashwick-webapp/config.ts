// This is set in app.run
var config: {
    flugelhornSocket: string;
    pageLoadServerTime: Date;
    pageLoadClientTime: Date;
    themes: { [name: string]: string; };
} = <any>{};

export = config;
