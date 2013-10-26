export function serverNow() {
    return new Date();
}

export function timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000);
}

export function dateToTimestamp(date: Date) {
    return Math.floor(date.getTime() / 1000);
}

export function roundDate(date: Date, period: number, rounder: (n: number) => number) {
    var base = new Date(2000, 0, 1).getTime();
    var period000 = period * 1000;  // convert s to ms
    return new Date(base + rounder((date.getTime() - base) / period000) * period000);
}
