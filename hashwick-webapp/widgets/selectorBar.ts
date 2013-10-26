import Signal = require("../../lib/signal");


class SelectorBar {
    public element: JQuery;
    public selectionChanged = new Signal();
    private selectedItem: JQuery;

    constructor(style: string) {
        this.element = $('<ul class="nav"></ul>').addClass(style)
            .on("click", "li", this.itemClick);
    }

    public addItem(value: string, text?: string) {
        if (!text)
            text = value;
        this.element.append($("<li>").attr("data-value", value)
            .append($('<a href="#"></a>').text(text)));
    }

    public clearItems() {
        this.element.empty();
        this.selectedItem = null;
    }

    public getSelectedValue() {
        return this.selectedItem.attr("data-value");
    }

    public setSelectedValue(value: string) {
        var item = this.element.children().filter(function () {
            return this.getAttribute("data-value") === value;
        });
        this.setSelectedItem(item);
    }

    public setSelectedItem(item: JQuery) {
        if (this.selectedItem)
            this.selectedItem.removeClass("active");
        this.selectedItem = item;
        if (item)
            item.addClass("active");
        this.selectionChanged.emit();
    }

    private itemClick = (event: Event) => {
        event.preventDefault();
        this.setSelectedItem($(event.target).closest("li"));
    };
}

export = SelectorBar;
