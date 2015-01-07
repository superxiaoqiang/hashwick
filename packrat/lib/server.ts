import _ = require("lodash");
import WebSocket = require("ws");


class Flugelserver {
    private server: any;
    private bindings: { [channel: string]: (socket: any, data: any) => void; } = {};

    constructor(port: number) {
        this.server = new WebSocket.Server({port: port});
        this.server.on("connection", this.receiveClient.bind(this));
    }

    public bind(channel: string, handler: (socket: any, data: any) => void) {
        this.bindings[channel] = handler;
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
            case "message":
                var binding = this.bindings[data.channel];
                if (binding)
                    binding(client, data.data);
                break;
        }
    }

    public broadcast(channel: string, data: any) {
        var message = JSON.stringify({channel: channel, data: data});
        _.each(this.server.clients, (client: any) => {
            if (channel in client.subscriptions)
                try {
                    client.send(message);
                } catch (err) { /* WHO CARES! :D */ }
        });
    }

    public sendToOne(socket: any, channel: string, data: any) {
        var message = JSON.stringify({channel: channel, data: data});
        try {
            socket.send(message);
        } catch (err) { /* WHO CARES! :D */ }
    }
}

export = Flugelserver;
