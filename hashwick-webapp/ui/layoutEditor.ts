import geometry = require("../utils/geometry");
import Rectangle = geometry.Rectangle;
import view_ = require("../views/view");
import SerializedView = view_.SerializedView;
import fx = require("../widgets/fx");
import layout = require("./layout");
import layoutDefs = require("./layoutDefs");
import paneDefs = require("./paneDefs");
import paneManip = require("./paneManip");
import ViewDialog = require("./viewDialog");


class LayoutEditor {
    public layout: layoutDefs.SerializedLayout;
    private backdrop: JQuery;
    private header: JQuery;
    public container: JQuery;
    private arena: Arena;
    private activePoint: ArenaPoint;

    constructor(layout: layoutDefs.SerializedLayout) {
        this.layout = layout;
    }

    public show() {
        var main = $("main");
        this.backdrop = $('<div class="layout-editor-backdrop"></div>')
            .appendTo("body");
        this.header = $('<header class="navbar navbar-inverse"></header>')
            .append($('<div class="navbar-header"><div class="navbar-brand">Layout Editor</div></div>'))
            .append($('<div class="navbar-collapse"></div>')
                .append($('<button type="button" class="pull-right btn navbar-btn btn-success">' +
                    'Done &raquo;</button>')
                    .on("click", this.dismiss.bind(this))))
            .appendTo("body");
        this.container = $("<div>")
            .css("position", "absolute").offset(main.offset()).width(main.width()).height(main.height())
            .on("mousemove", this.mousemove.bind(this))
            .appendTo("body");

        fx.slideHorz(this.header, 1, 0).then(() => {
            this.header.addClass("navbar-fixed-top");
        }).done();
        fx.fadeIn(this.backdrop);
        this.buildArena();
    }

    private dismiss() {
        this.container.remove();
        this.header.removeClass("navbar-fixed-top");
        fx.slideHorz(this.header, 0, 1).then(() => {
            this.header.remove();
        }).done();
        fx.fadeOutAndRemove(this.backdrop);
    }

    public applyAndReload() {
        layout.setLayout(this.layout);
        this.buildArena();
    }

    private buildArena() {
        var main = $("main");
        var bounds = {left: 0, top: 0, width: main.width(), height: main.height()};
        this.arena = new Arena(this.layout, bounds);

        _.each(this.arena.points, point => {
            point.buildUI(this);
        });
    }

    private mousemove(event: MouseEvent) {
        var point = this.arena.findClosestPoint(event.pageX, event.pageY - $("main").offset().top);
        if (point !== this.activePoint) {
            if (this.activePoint)
                this.activePoint.element.removeClass("active");
            point.element.addClass("active");
            this.activePoint = point;
        }
    }
}


class Arena {
    public points: { [key: string]: ArenaPoint } = {};

    constructor(layout: layoutDefs.SerializedLayout, bounds: geometry.Rectangle) {
        this.walkPanes(layout.rootPane, bounds, []);
    }

    private walkPanes(pane: paneDefs.SerializedPane, bounds: geometry.Rectangle, path: number[]) {
        this.storeFourPoints(bounds, path);
        paneManip.enumChildPositions(pane, bounds, (child, childPos, index) => {
            this.walkPanes(child, childPos, path.concat([index]));
        });
    }

    private storeFourPoints(bounds: geometry.Rectangle, path: number[]) {
        this.storePoint(new ArenaPoint(path, bounds.left, bounds.top, bounds.width, "top"));
        this.storePoint(new ArenaPoint(path, bounds.left, bounds.top + bounds.height, bounds.width, "bottom"));
        this.storePoint(new ArenaPoint(path, bounds.left, bounds.top, bounds.height, "left"));
        this.storePoint(new ArenaPoint(path, bounds.left + bounds.width, bounds.top, bounds.height, "right"));
    }

    private storePoint(point: ArenaPoint) {
        var key = "" + point.xCenter + point.yCenter + point.size;
        this.points[key] = point;
    }

    public findClosestPoint(x: number, y: number) {
        var closestPoint: ArenaPoint = undefined;
        var closestDist = Infinity;
        for (var p in this.points) {
            var point = this.points[p];
            if (!point.gravityFacing(x, y))
                continue;
            var dx = x - point.xCenter;
            var dy = y - point.yCenter;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestPoint = point;
                closestDist = dist;
            }
        }
        return closestPoint;
    }
}


class ArenaPoint {
    public element: JQuery;
    public xCenter: number;
    public yCenter: number;
    public editor: LayoutEditor;

    constructor(public path: number[], public left: number, public top: number,
                public size: number, public edge: string) {
        if (this.edge === "top" || this.edge === "bottom") {
            this.xCenter = left + size / 2;
            this.yCenter = top + (this.edge === "top" ? 20 : -20);
        } else {
            this.xCenter = left + (this.edge === "left" ? 20 : -20);
            this.yCenter = top + size / 2;
        }
    }

    public gravityFacing(x: number, y: number) {
        if (this.edge === "top")
            return x >= this.left && x <= this.left + this.size && y >= this.top;
        if (this.edge === "bottom")
            return x >= this.left && x <= this.left + this.size && y <= this.top;
        if (this.edge === "left")
            return y >= this.top && y <= this.top + this.size && x >= this.left;
        if (this.edge === "right")
            return y >= this.top && y <= this.top + this.size && x <= this.left;
    }

    public buildUI(editor: LayoutEditor) {
        this.editor = editor;

        var sizeCSS = this.edge === "top" || this.edge === "bottom"
            ? <any>{width: this.size} : {height: this.size};

        this.element = $('<div class="layout-editor-insert-bar">')
            .addClass(this.edge)
            .css({left: this.left, top: this.top}).css(sizeCSS)
            .append($('<div class="content-positioner"></div>'))
            .append($('<div class="content"></div>')
                .append($('<a href="#"></a>').text("+").on("click", this.add.bind(this))))
            .appendTo(editor.container);
    }

    public add(event: Event) {
        event.preventDefault();
        new ViewDialog().show().then(view => {
            var newPane = {type: "view", view: view};
            addPaneToLayout(this.editor.layout, this.path, this.edge, newPane);
            this.editor.applyAndReload();
        }).done();
    }
}


function addPaneToLayout(layout: layoutDefs.SerializedLayout,
                         path: number[], edge: string, newPane: paneDefs.SerializedPane) {
    if (path.length)
        addPaneToSplitPane(<paneDefs.SerializedSplitPane>layout.rootPane, path, edge, newPane);
    else
        layout.rootPane = paneManip.createSplitPane(layout.rootPane, edge, newPane);
}

function addPaneToSplitPane(curPane: paneDefs.SerializedSplitPane,
                       path: number[], edge: string, newPane: paneDefs.SerializedPane) {
    if (path.length > 1)
        addPaneToSplitPane(<paneDefs.SerializedSplitPane>curPane.children[path[0]].pane,
                           path.slice(1), edge, newPane);
    else
        paneManip.joinIntoSplitPane(curPane, path[0], edge, newPane);
}


export = LayoutEditor;
