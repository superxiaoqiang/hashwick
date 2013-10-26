export function arrayRemove<T>(array: T[], value: T) {
    var index = array.indexOf(value);
    if (index !== -1)
        array.splice(index, 1);
}
