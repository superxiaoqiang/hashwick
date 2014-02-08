export function roundNumber(num: number, places?: number) {
    var e10 = Math.pow(10, places || 0);
    return Math.round(num * e10) / e10;
}

export function getLastSigPlace(num: number, figs: number) {
    var place = figs - 1 - Math.floor(Math.log(num) / Math.log(10));
    return place > 0 ? place : 0;
}

export function roundNumberSigFigs(num: number, figs: number) {
    return roundNumber(num, getLastSigPlace(num, figs));
}

export function log2(a: number, b: number) {
    // I really hate floating point…
    return Math.round(Math.log(a) / Math.log(b) * 10000000) / 10000000;
}
