import http = require("http");

import Promise = require("bluebird");


export interface HasRequest {
    request(options: any, callback?: Function): http.ClientRequest;
}


export function request(module: HasRequest, options: any) {
    return new Promise((resolve, reject) => {
        var req = module.request(options, resolve);
        req.on("error", reject);
        req.end();
    });
}

export function readBody(response: http.ClientResponse) {
    return new Promise<string>((resolve, reject) => {
        var data = "";
        response.on("data", (chunk: string) => {
            data += chunk;
        });
        response.on("close", () => {
            reject();
        });
        response.on("end", () => {
            resolve(data);
        });
    });
}
