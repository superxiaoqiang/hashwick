import strings = require("../utils/strings");


export function createSVGElement(name: string) {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
}

export function makeFormRow(left: string, right: string, label: string, input: JQuery) {
    var id = strings.randomGibberish();
    return $('<div class="form-group"></div>')
        .append($('<label class="control-label"></label>').addClass(left).attr("for", id).text(label))
        .append($('<div>').addClass(right)
            .append(input.attr("id", id)));
}

export function makeCheckboxRow(clazz: string, label: string, input: JQuery) {
    return $('<div class="form-group"></div>')
        .append($("<div>").addClass(clazz)
            .append($('<div class="checkbox"></div>')
                .append($("<label>")
                    .append(input)
                    .append(' ' + _.escape(label)))));
}
