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

export interface NumberDict {
    [key: string]: number;
}

export function slide(element: JQuery, start: NumberDict, stop: NumberDict) {
    var width = element.outerWidth(true);
    var height = element.outerHeight(true);
    var stageWrapper = $("<div>").css({position: "relative", overflow: "hidden",
                                       width: width, height: height});
    element.after(stageWrapper).detach();
    var stage = $('<div class="generic-animation" style="position:relative"></div>')
        .append($("<div>").append(element).css({position: "absolute", width: width}).css(start))
        .appendTo(stageWrapper);
    stage.width();  // trigger reflow
    stage.css(stop);
    return new Promise(resolve => {
        afterTransition(stage, () => {
            stageWrapper.after(element).detach();
            resolve();
        });
    });
}

export function slideHorz(element: JQuery, start: number, stop: number) {
    var width = element.outerWidth(true);
    return slide(element, {left: start * width}, {left: (stop - start) * width});
}

export function slideVert(element: JQuery, start: number, stop: number) {
    var height = element.outerHeight(true);
    return slide(element, {top: start * height}, {top: (stop - start) * height});
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
