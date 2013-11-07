import logger_ = require("../logger");
if (0) logger_;
import Logger = logger_.Logger;
import user = require("../user");
import context = require("../data/context");
import serialization = require("../views/serialization");
import view_ = require("../views/view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


export interface PaneClass {
    deserialize(context: context.DeserializationContext, structure: SerializedPane): Pane;
}

export interface Pane {
    type: string;
    paneElement: JQuery;

    serialize(context: context.SerializationContext): SerializedPane;
    destroy(): void;
    doLayout(): void;
}

export interface SerializedPane {
    type: string;
}


class ViewPane implements Pane {
    public static type = "view";

    private view: View;
    public paneElement: JQuery;
    private headerElement: JQuery;
    public headerMenuElement: JQuery;
    public titleElement: JQuery;
    private bodyElement: JQuery;

    public static deserialize(context: context.DeserializationContext, structure: SerializedViewPane) {
        return new this(context, structure);
    }

    constructor(context: context.DeserializationContext, structure: SerializedViewPane) {
        this.paneElement = $('<div class="pane"></div>')
            .append(this.headerElement = $('<div class="pane-header"></div>')
                .append(this.headerMenuElement = $('<ul class="pane-buttons"></ul>'))
                .append(this.titleElement = $('<div class="pane-title"></div>')))
            .append(this.bodyElement = $('<div class="pane-body"></div>'));
        var uiContext = new ViewContext(this);
        this.view = serialization.deserializeView(context, structure.view, uiContext);
        this.bodyElement.append(this.view.viewElement);
    }

    public serialize(context: context.SerializationContext): SerializedViewPane {
        return {
            type: ViewPane.type,
            view: this.view.serialize(context),
        };
    }

    public destroy() {
        this.view.destroy();
    }

    public doLayout() {
        this.view.doLayout();
    }
}

interface SerializedViewPane extends SerializedPane {
    view: SerializedView;
}

class ViewContext implements ViewUIContext {
    constructor(private pane: ViewPane) { }

    setTitle(text: string) {
        this.pane.titleElement.text(text);
    }

    addButton(text: string) {
        return $("<li>").text(text).appendTo(this.pane.headerMenuElement);
    }
}


class SplitPane {
    public paneElement: JQuery;
    public children: SplitPaneChild[];

    public static deserializeChildren(context: context.DeserializationContext, children: SerializedSplitPaneChild[]) {
        return _.map(children, child => {
            return {
                pane: deserializePane(context, child.pane),
                sizeWeight: child.sizeWeight,
            };
        });
    }

    constructor(children: SplitPaneChild[]) {
        this.children = children;

        this.paneElement = $('<div class="pane"></div>');
        _.each(children, child => {
            this.paneElement.append(child.pane.paneElement);
        });
    }

    public serialize(context: context.SerializationContext): SerializedSplitPane {
        return {
            type: (<any>this).constructor.type,
            children: _.map(this.children, child => {
                return {
                    pane: child.pane.serialize(context),
                    sizeWeight: child.sizeWeight,
                };
            }),
        };
    }

    public destroy() {
        _.each(this.children, child => child.pane.destroy());
    }

    public doLayout() {
        this.calculatePaneSizes();
        _.each(this.children, child => {
            child.pane.paneElement.css(child.positionCSS);
            child.pane.doLayout();
        });
    }

    public calculatePaneSizes() { throw 0; }
}

interface SplitPaneChild {
    pane: Pane;
    sizeWeight: number;
    positionCSS?: any;
}

interface SerializedSplitPane extends SerializedPane {
    children: SerializedSplitPaneChild[];
}

interface SerializedSplitPaneChild {
    pane: SerializedPane;
    sizeWeight: number;
}


class SplitHorizontalPane extends SplitPane implements Pane {
    public static type = "splitHorz";

    public static deserialize(context: context.DeserializationContext, structure: SerializedSplitPane) {
        var children = SplitPane.deserializeChildren(context, structure.children);
        return new SplitHorizontalPane(children);
    }

    public calculatePaneSizes() {
        var totalSizeWeight = _.reduce(this.children, (a, c) => a + c.sizeWeight, 0);
        var totalHeight = this.paneElement.height();
        var curSizeWeight = 0;
        _.each(this.children, child => {
            child.positionCSS = {
                top: totalHeight * curSizeWeight / totalSizeWeight,
                height: totalHeight * child.sizeWeight / totalSizeWeight,
            };
            curSizeWeight += child.sizeWeight;
        });
    }
}


class SplitVerticalPane extends SplitPane implements Pane {
    public static type = "splitVert";

    public static deserialize(context: context.DeserializationContext, structure: SerializedSplitPane) {
        var children = SplitPane.deserializeChildren(context, structure.children);
        return new SplitVerticalPane(children);
    }

    public calculatePaneSizes() {
        var totalSizeWeight = _.reduce(this.children, (a, c) => a + c.sizeWeight, 0);
        var totalWidth = this.paneElement.width();
        var curSizeWeight = 0;
        _.each(this.children, child => {
            child.positionCSS = {
                left: totalWidth * curSizeWeight / totalSizeWeight,
                width: totalWidth * child.sizeWeight / totalSizeWeight,
            };
            curSizeWeight += child.sizeWeight;
        });
    }
}


class ErrorPane implements Pane {
    public static type = "error";

    public paneElement: JQuery;

    public constructor() {
        this.paneElement = $('<div class="pane">Error loading pane</div>');
    }

    public serialize(context: context.SerializationContext): SerializedErrorPane {
        return {type: ErrorPane.type};
    }
    
    public destroy() { }

    public doLayout() { }
}

interface SerializedErrorPane extends SerializedPane { }


var log = new Logger("ui.panes");

var paneClasses: { [type: string]: PaneClass } = {};
paneClasses[ViewPane.type] = ViewPane;
paneClasses[SplitHorizontalPane.type] = SplitHorizontalPane;
paneClasses[SplitVerticalPane.type] = SplitVerticalPane;
// exclude ErrorPane

export function deserializePane(context: context.DeserializationContext, structure: SerializedPane) {
    try {
        var paneClass = paneClasses[structure.type];
        return paneClass.deserialize(context, structure);
    } catch(ex) {
        log.exception(ex);
        return new ErrorPane();
    }
}
