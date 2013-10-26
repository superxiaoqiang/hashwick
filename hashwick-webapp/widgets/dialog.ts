import fx = require("./fx");


class Dialog {
    private backdrop: JQuery;
    private dialog: JQuery;
    public header: JQuery;
    public content: JQuery;
    public footer: JQuery;

    constructor(title: string) {
        this.dialog = $('<div class="modal"></div>')
            .append($('<div class="modal-dialog"></div>')
                .append($('<div class="modal-content"></div>')
                    .append(this.header = $('<div class="modal-header">')
                        .append($('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>')
                            .on("click", this.dismiss))
                        .append($('<h4 class="modal-title"></h4>').text(title)))
                    .append(this.content = $('<div class="modal-body"></div>'))
                    .append(this.footer = $('<div class="modal-footer"></div>'))));
        this.backdrop = $('<div class="modal-backdrop in">');
    }

    public show() {
        $("body").append(this.dialog.show()).append(this.backdrop);
        fx.fadeIn(this.backdrop);
    }

    public dismiss = () => {
        this.dialog.remove();
        fx.fadeOutAndRemove(this.backdrop);
    };
}


export = Dialog;
