export function toFakeUTC(date: Date) {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
}

export function roundDown(date: Date, period: number) {
    var period000 = period * 1000;
    return new Date(Math.floor(date.getTime() / period000) * period000);
}
