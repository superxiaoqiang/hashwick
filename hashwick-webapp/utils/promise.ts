export function tolerantWhen<T>(promises: JQueryGenericPromise<T>[]): JQueryGenericPromise<void> {
    var count = -1;
    var ret = $.Deferred();

    function track() {
        if (++count === promises.length)
            ret.resolve();
    }

    _.each(promises, p => {
        p.then(track, track);
    })

    track();
    return ret;
}
