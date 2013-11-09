export function fadeIn(element: JQuery) {
    element.addClass("faded-out");
    element.width();  // trigger reflow
    element.addClass("generic-animation").removeClass("faded-out");
    afterTransition(element, () => {
        element.removeClass("generic-animation");
    });
}

export function fadeOutAndRemove(element: JQuery) {
    element.addClass("generic-animation faded-out");
    afterTransition(element, () => {
        element.removeClass("generic-animation").removeClass("faded-out").remove();
    });
}

export function slideHorz(element: JQuery, start: number, stop: number) {
    var width = element.width();
    var height = element.height();
    var stageWrapper = $("<div>").css({position: "relative", overflow: "hidden", width: width, height: height});
    element.after(stageWrapper).detach();
    var stage = $('<div class="generic-animation" style="position:relative"></div>')
        .append($("<div>").append(element).css({position: "absolute", width: width, left: start * width}))
        .appendTo(stageWrapper);
    stage.width();  // trigger reflow
    stage.css("left", (stop - start) * width);
    var pending = $.Deferred();
    afterTransition(stage, () => {
        stageWrapper.after(element).detach();
        pending.resolve();
    });
    return pending;
}

export function slideReplaceHorz(former: JQuery, latter: JQuery, left?: boolean) {
    if (former.is(latter))
        return;
    var factor = left ? -1 : 1;
    var width = former.outerWidth(true);
    var height = former.height();
    var stageWrapper = $("<div>").css({position: "relative", overflow: "hidden", width: width, height: height});
    former.after(stageWrapper).detach();
    var stage = $('<div class="generic-animation" style="position:relative"></div>')
        .append($("<div>").append(former).css({position: "absolute", width: width}))
        .append($("<div>").append(latter).css({position: "absolute", width: width, left: -factor * width}))
        .appendTo(stageWrapper);
    stage.width();  // trigger reflow
    stage.css("left", factor * width);
    afterTransition(stage, () => { stageWrapper.after(latter).detach(); });
}

function afterTransition(element: JQuery, func: (event: Event) => void) {
    element.one("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", func);
}
