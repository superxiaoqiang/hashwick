import fun = require("../fun");


function sortedSlice<T>(xs: T[], key: (x: T) => any, lowest: T, highest: T,
                        leftInclusive: boolean, rightInclusive: boolean) {
    // This should be replaced with a binary search for the endpoints
    // whenever I'm feeling less lazy
    return _.filter(xs, x => {
        var k = key(x);
        return (leftInclusive ? lowest <= k : lowest < k) &&
            (rightInclusive ? k <= highest : k < highest);
    });
}

export function rangeMerge<T>(arrays: T[][], sortKey: (x: T) => any, uniqueKey: (x: T) => any) {
    var edgeValues = _.map(arrays, a => a.length ? [a[0], a[a.length - 1]] : []);
    var edgeKeys = _.uniq(_.map(_.flatten(edgeValues, true), sortKey));

    // if there are 0 or 1 edgeKeys, then they're are equal, so
    // sorting isn't necessary; just merge all input arrays
    if (edgeKeys.length < 2)
        return _.reduce(arrays, (acc, arr) => acc.concat(arr));

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
            var leftInclusive = sortKey(array[0]) === range.edges[0];
            var rightInclusive = sortKey(array[array.length - 1]) === range.edges[1];
            return sortedSlice(array, sortKey, range.edges[0], range.edges[1],
                leftInclusive, rightInclusive);
        });
        slices = _.filter(slices, slice => <any>slice.length);
        if (slices.length === 1)
            return slices[0];

        var ret = fun.uniqViaObject(_.flatten(slices, true), uniqueKey);
        ret.sort((a, b) => sortKey(a) - sortKey(b));  // ~15% speedup over _.sort
        return ret;
    }), true);
}
