var config = require("./config." + (process.env.NODE_ENV || "production"));
export = config;
