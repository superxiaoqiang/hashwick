export function apply(dest: any, source: any) {
    for (var name in source)
        if (!dest.hasOwnProperty(name))
            dest[name] = source[name];
}
