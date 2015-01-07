interface Config {
    devMode: boolean;
    httpPort: number;
    flugelhornSocket: string;
    themes: { [name: string]: string };
}

var config = <Config>require("./config." + (process.env.NODE_ENV || "production"));

export = config;
