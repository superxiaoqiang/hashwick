import config = require("./config");


export function index(req: ExpressServerRequest, res: ExpressServerResponse) {
    res.render("index", {
        js_config: {
            flugelhornSocket: config.flugelhornSocket,
        },
    });
}
