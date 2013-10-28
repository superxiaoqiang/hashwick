import _ = require("underscore");
import WebSocket = require("ws");


class Flugelserver {
    private server: any;

    constructor(port: number) {
        this.server = new WebSocket.Server({port: port});
        this.server.on("connection", this.receiveClient.bind(this));
    }

    private receiveClient(client: any) {
        client.on("message", this.clientMessage.bind(this, client));
        client.subscriptions = {};
    }

    private clientMessage(client: any, message: string) {
        var data = JSON.parse(message);
        switch (data.command) {
            case "subscribe":
                client.subscriptions[data.channel] = true;
                break;
            case "unsubscribe":
                delete client.subscriptions[data.channel];
                break;
        }
    }

    public broadcast(channel: string, data: any) {
        var message = JSON.stringify(_.extend({channel: channel, data: data}));
        _.each(this.server.clients, (client: any) => {
            if (channel in client.subscriptions)
                client.send(message);
        });
    }
}

export = Flugelserver;
