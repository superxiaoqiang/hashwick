import context = require("../data/context");
import view_ = require("../views/view");
import SerializedView = view_.SerializedView;


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


export interface SerializedViewPane extends SerializedPane {
    view: SerializedView;
}

export interface SerializedSplitPane extends SerializedPane {
    children: SerializedSplitPaneChild[];
}

export interface SerializedSplitPaneChild {
    pane: SerializedPane;
    sizeWeight: number;
}

export interface SerializedErrorPane extends SerializedPane { }
