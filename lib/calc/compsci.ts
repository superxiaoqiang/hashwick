import fun = require("../fun");


function sortedSlice<T>(xs: T[], key: (x: T) => any, lowest: T, highest: T, rightInclusive: boolean) {
    // This should be replaced with a binary search for the endpoints
    // whenever I'm feeling less lazy
    return _.filter(xs, x => {
        var k = key(x);
        return lowest <= k && (rightInclusive ? k <= highest : k < highest);
    });
}

export function rangeMerge<T>(arrays: T[][], sortKey: (x: T) => any, uniqueKey: (x: T) => any) {
    var edgeValues = _.map(arrays, a => a.length ? [a[0], a[a.length - 1]] : []);
    var edgeKeys = _.uniq(_.map(_.flatten(edgeValues, true), sortKey));
    edgeKeys.sort();
    var edgePairs = _.map(_.range(edgeKeys.length - 1), i => [edgeKeys[i], edgeKeys[i + 1]]);

    var ranges = _.map(edgePairs, pair => {
        var localArrays = _.filter(arrays, a => {
            return a.length && sortKey(a[0]) <= pair[1] && sortKey(a[a.length - 1]) >= pair[0];
        });
        return {edges: pair, arrays: localArrays};
    });

    return _.flatten(_.map(ranges, range => {
        var slices = _.map(range.arrays, (array: T[]) => {
            var rightInclusive = sortKey(array[array.length - 1]) === range.edges[1];
            return sortedSlice(array, sortKey, range.edges[0], range.edges[1], rightInclusive);
        });
        if (slices.length === 1)
            return slices[0];
        return _.sortBy(fun.uniqViaObject(_.flatten(slices, true), uniqueKey), sortKey);
    }), true);
}
