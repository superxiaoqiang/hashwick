export function roundDown(date: Date, period: number) {
    var period000 = period * 1000;
    return new Date(Math.floor(date.getTime() / period000) * period000);
}
