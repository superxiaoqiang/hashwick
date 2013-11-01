export function splat(func: Function) {
    return (array: any[]) => func.apply(this, array);
}
