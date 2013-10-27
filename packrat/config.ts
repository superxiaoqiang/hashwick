var config = require("./config." + (process.env.NODE_ENV || "development"));
export = config;
