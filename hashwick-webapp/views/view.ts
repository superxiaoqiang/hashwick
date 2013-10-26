import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;


export interface ViewClass {
    deserialize(context: DeserializationContext, structure: SerializedView, uiContext: ViewUIContext): View;
}

export interface View {
    viewElement: JQuery;

    serialize(context: SerializationContext): SerializedView;
    destroy(): void;
    doLayout(): void;
}

export interface SerializedView {
    type: string;
}

export interface ViewUIContext {
    setTitle(text: string): void;
}
