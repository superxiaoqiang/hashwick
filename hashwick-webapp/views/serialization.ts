import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import view_ = require("./view");
if (0) view_;
import SerializedView = view_.SerializedView;
import ViewClass = view_.ViewClass;
import ViewUIContext = view_.ViewUIContext;


export var viewClasses: { [type: string]: ViewClass } = {};

export function deserializeView(context: DeserializationContext, structure: SerializedView, uiContext: ViewUIContext) {
    return viewClasses[structure.type].deserialize(context, structure, uiContext);
}
