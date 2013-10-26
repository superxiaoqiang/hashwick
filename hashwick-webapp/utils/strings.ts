export function formatNumberSigFigs(num: number, figs: number) {
    var places = figs - 1 - Math.floor(Math.log(num) / Math.log(10));
    places = places > 0 ? places : 0;
    return num.toFixed(places);
}

export function formatNumberFixed(num: number, places: number) {
    // This doesn't need to be here, but I'm using it to format monetary
    // values so I can search through the codebase for occurrences of that
    return num.toFixed(places);
}

export function formatMag(num: number) {
    if (num >= 1000)
        return Math.floor(num / 1000) + "k";
    return num.toFixed();
}

export function timeDiffVeryShort(seconds: number) {
    if (seconds > 3600)
        return Math.floor(seconds / 3600) + "h";
    if (seconds > 60)
        return Math.floor(seconds / 60) + "m";
    return Math.floor(seconds) + "s";
}

export function timeDiffShort(seconds: number) {
    if (seconds > 3600)
        return Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m";
    if (seconds > 60)
        return Math.floor(seconds / 60) + "m " + Math.floor(seconds % 60) + "s";
    return Math.floor(seconds) + "s";
}


export function randomGibberish() {
    return "id" + Math.random() + new Date().getTime();
}

export function uniquifyNumericallyParenthetically(key: string, pool: string[]) {
    if (!_.contains(key, pool))
        return key
    for (var i = 1; ; ++i) {
        var newKey = key + " (" + i + ")";
        if (!_.contains(newKey, pool))
            return newKey;
    }
}
