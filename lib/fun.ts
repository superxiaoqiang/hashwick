export function splat(func: Function) {
    return (array: any[]) => func.apply(this, array);
}


export function throttle<T extends Function>(delay: number, func: T): T {
    var timeoutID: number;
    var lastCalled: Date;
    var result: any;

    function call() {
        timeoutID = undefined;
        result = func.apply(this, arguments);
        lastCalled = new Date();
        return result;
    }

    return function () {
        if (lastCalled === undefined)
            return call();
        var wait = lastCalled.getTime() + delay - new Date().getTime();
        if (wait <= 0)
            return call();
        if (timeoutID === undefined)
            timeoutID = setTimeout(call, wait);
        return result;
    }
}
