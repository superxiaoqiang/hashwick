export function bodyAmalgamator(callback: (data: string) => void) {
    return (response: EventEmitter) => {
        var data = "";
        response.on("data", chunk => {
            data += chunk;
        });
        response.on("end", () => {
            callback(data);
        });
    };
}
