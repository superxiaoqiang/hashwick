import fx = require("./fx");


class PopupMenu {
    private element: JQuery;
    private backdrop: JQuery;

    constructor() {
        this.element = $('<ul class="dropdown-menu"></ul>')
            .on("click", "li", this.itemClicked);
        this.backdrop = $("<div>").attr("class", "dropdown-backdrop")
            .on("click", this.dismiss.bind(this));
    }

    public addItem(text: string, onClick: () => void) {
        this.element.append($("<li>")
            .data("onClick", onClick)
            .append($('<a href="#"></a>').text(text)));
    }

    public show(anchor: JQuery) {
        this.element.css({position: "absolute", visibility: "none"});
        $("body").append(this.backdrop).append(this.element);
        this.element.css({
            visibility: "",
            left: anchor.offset().left + anchor.outerWidth() - this.element.outerWidth(),
            top: anchor.offset().top + anchor.outerHeight(),
        });
        $("body").append(this.element.show()).append(this.backdrop);
    }

    public dismiss() {
        fx.fadeOutAndRemove(this.element);
        this.backdrop.remove();
    }

    private itemClicked = (event: Event) => {
        event.preventDefault();
        this.dismiss();
        var handler = $(event.target).closest("li").data("onClick");
        handler();
    };
}

export = PopupMenu;
