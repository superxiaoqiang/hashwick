function sortedSlice<T>(xs: T[], key: (x: T) => any, lowest: T, highest: T, rightInclusive: boolean) {
    // This should be replaced with a binary search for the endpoints
    // whenever I'm feeling less lazy
    return _.filter(xs, x => {
        var k = key(x);
        return lowest <= k && (rightInclusive ? k <= highest : k < highest);
    });
}

export function rangeMerge<T>(arrays: T[][], sortKey: (x: T) => any, uniqueKey: (x: T) => any) {
    var endValues = _.map(arrays, a => a.length ? [a[0], a[a.length - 1]] : []);
    var endKeys = _.uniq(_.map(_.flatten(endValues, true), sortKey));
    endKeys.sort();
    var endPairs = _.map(_.range(endKeys.length - 1), i => [endKeys[i], endKeys[i + 1]]);

    var ranges = _.map(endPairs, pair => {
        var localArrays = _.filter(arrays, a => {
            return a.length && sortKey(a[0]) <= pair[0] && sortKey(a[a.length - 1]) >= pair[1];
        });
        return {endpoints: pair, arrays: localArrays};
    });

    return _.flatten(_.map(ranges, range => {
        var slices = _.map(range.arrays, (array: T[]) => {
            var rightInclusive = sortKey(array[array.length - 1]) === range.endpoints[1];
            return sortedSlice(array, sortKey, range.endpoints[0], range.endpoints[1], rightInclusive);
        });
        if (slices.length === 1)
            return slices[0];
        return _.sortBy(_.uniq(_.flatten(slices, true), uniqueKey), sortKey);
    }), true);
}
