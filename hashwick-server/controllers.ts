var assets = require("./assets");
import config = require("./config");


export function index(req: ExpressServerRequest, res: ExpressServerResponse) {
    res.render("index", {
        assetURL: getAssetURL,
        js_config: {
            flugelhornSocket: config.flugelhornSocket,
        },
    });
}


function getAssetURL(name: string) {
    var slashless = name.slice(1);
    if (slashless in assets)
        return name.replace(/^(.+?\/)?([^\/]+?)(\.[^.\/]+?)?$/,
            "$1" + assets[slashless] + "$3");
    return name;
}
