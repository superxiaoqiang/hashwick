import logger = require("../logger");
import user = require("../user");
import context = require("../data/context");
import serialization = require("../views/serialization");
import view_ = require("../views/view");
if (0) view_;
import View = view_.View;
import ViewUIContext = view_.ViewUIContext;
import paneDefs = require("./paneDefs");


class ViewPane implements paneDefs.Pane {
    public static type = "view";

    private view: View;
    public paneElement: JQuery;
    private headerElement: JQuery;
    public headerMenuElement: JQuery;
    public titleElement: JQuery;
    private bodyElement: JQuery;

    public static deserialize(context: context.DeserializationContext, structure: paneDefs.SerializedViewPane) {
        return new this(context, structure);
    }

    constructor(context: context.DeserializationContext, structure: paneDefs.SerializedViewPane) {
        this.paneElement = $('<div class="pane"></div>')
            .append(this.headerElement = $('<div class="pane-header"></div>')
                .append(this.headerMenuElement = $('<ul class="pane-buttons"></ul>'))
                .append(this.titleElement = $('<div class="pane-title"></div>')))
            .append(this.bodyElement = $('<div class="pane-body"></div>'));
        var uiContext = new ViewContext(this);
        this.view = serialization.deserializeView(context, structure.view, uiContext);
        this.bodyElement.append(this.view.viewElement);
    }

    public serialize(context: context.SerializationContext): paneDefs.SerializedViewPane {
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

class ViewContext implements ViewUIContext {
    constructor(private pane: ViewPane) { }

    setTitle(text: string) {
        this.pane.titleElement.text(text);
    }

    addButton(text: string) {
        return $("<li>")
            .append($('<a href="#"></a>').text(text))
            .appendTo(this.pane.headerMenuElement);
    }
}


class SplitPane {
    public paneElement: JQuery;
    public children: SplitPaneChild[];

    public static deserializeChildren(context: context.DeserializationContext,
                                      children: paneDefs.SerializedSplitPaneChild[]) {
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

    public serialize(context: context.SerializationContext): paneDefs.SerializedSplitPane {
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
    pane: paneDefs.Pane;
    sizeWeight: number;
    positionCSS?: any;
}


class SplitHorizontalPane extends SplitPane implements paneDefs.Pane {
    public static type = "splitHorz";

    public static deserialize(context: context.DeserializationContext,
                              structure: paneDefs.SerializedSplitPane) {
        var children = SplitPane.deserializeChildren(context, structure.children);
        return new SplitHorizontalPane(children);
    }

    public calculatePaneSizes() {
        var totalSizeWeight = _.reduce<SplitPaneChild, number>(this.children, (a, c) => a + c.sizeWeight, 0);
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


class SplitVerticalPane extends SplitPane implements paneDefs.Pane {
    public static type = "splitVert";

    public static deserialize(context: context.DeserializationContext,
                              structure: paneDefs.SerializedSplitPane) {
        var children = SplitPane.deserializeChildren(context, structure.children);
        return new SplitVerticalPane(children);
    }

    public calculatePaneSizes() {
        var totalSizeWeight = _.reduce<SplitPaneChild, number>(this.children, (a, c) => a + c.sizeWeight, 0);
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


class ErrorPane implements paneDefs.Pane {
    public static type = "error";

    public paneElement: JQuery;

    public constructor() {
        this.paneElement = $('<div class="pane">Error loading pane</div>');
    }

    public serialize(context: context.SerializationContext): paneDefs.SerializedErrorPane {
        return {type: ErrorPane.type};
    }
    
    public destroy() { }

    public doLayout() { }
}


var log = new logger.Logger("ui.panes");

var paneClasses: { [type: string]: paneDefs.PaneClass } = {};
paneClasses[ViewPane.type] = ViewPane;
paneClasses[SplitHorizontalPane.type] = SplitHorizontalPane;
paneClasses[SplitVerticalPane.type] = SplitVerticalPane;
// exclude ErrorPane

export function deserializePane(context: context.DeserializationContext,
                                structure: paneDefs.SerializedPane) {
    try {
        var paneClass = paneClasses[structure.type];
        return paneClass.deserialize(context, structure);
    } catch(ex) {
        log.exception(ex);
        return new ErrorPane();
    }
}
