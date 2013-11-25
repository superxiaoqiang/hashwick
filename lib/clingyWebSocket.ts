export interface ClingyWebSocketOptions {
    maker: () => any;
    timeout?: number;
}


export class ClingyWebSocket {
    private maker: () => any;
    private timeout: number;

    private active: boolean;
    private socket: any;
    private lastContactAt: number;
    private timeoutInterval: number;

    public onopen: (event: Event) => void;
    public onclose: (event: CloseEvent) => void;
    public onmessage: (event: MessageEvent) => void;
    public onconnecting: () => void;
    public ontimeout: () => void;

    constructor(private options: ClingyWebSocketOptions) {
        this.maker = options.maker;
        this.timeout = options.timeout || 60 * 1000;

        this.active = true;
        this.connect();
        this.timeoutInterval = setInterval(this.checkTimeout, this.timeout / 10);
    }

    public close() {
        this.socket.close();
        this.active = false;
        clearInterval(this.timeoutInterval);
    }

    public getReadyState() {
        return this.socket ? this.socket.readyState : WebSocket.CLOSED;
    }

    public send(message: string) {
        this.socket.send(message);
    }

    private connect() {
        this.socket = this.maker();
        this.socket.onopen = this.onOpen;
        this.socket.onclose = this.onClose;
        this.socket.onmessage = this.onMessage;
        this.lastContactAt = Date.now();
        if (this.onconnecting)
            this.onconnecting();
    }

    private reconnect() {
        this.socket.close();
        this.connect();
    }

    private checkTimeout = () => {
        if (Date.now() > this.lastContactAt + this.timeout) {
            if (this.ontimeout)
                this.ontimeout();
            this.reconnect();
        }
    };

    private onOpen = (event: Event) => {
        if (this.onopen)
            this.onopen(event);
    };

    private onClose = (event: CloseEvent) => {
        if (this.onclose)
            this.onclose(event);
    };

    private onMessage = (event: MessageEvent) => {
        this.lastContactAt = Date.now();
        if (this.onmessage)
            this.onmessage(event);
    };
}
