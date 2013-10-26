import logger = require("../logger");
import context_ = require("../data/context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import SerializationContext = context_.SerializationContext;
import serialization = require("./serialization");
import view_ = require("./view");
if (0) view_;
import View = view_.View;
import SerializedView = view_.SerializedView;
import ViewUIContext = view_.ViewUIContext;


class ConsoleView implements View {
    public static type = "console";

    public viewElement: JQuery;
    private scrollback: JQuery;
    private input: JQuery;

    public static deserialize(context: DeserializationContext, structure: SerializedConsoleView,
                              uiContext: ViewUIContext): ConsoleView {
        return new ConsoleView(uiContext);
    }

    constructor(uiContext: ViewUIContext) {
        uiContext.setTitle("Console");
        this.viewElement = $('<div class="view"></div>')
            .append(this.scrollback = $('<div class="console-scrollback">'))
            .append(this.input = $('<input class="form-control console-command">'));
        logger.onOutput.attach(this.output);
    }

    public serialize(context: SerializationContext): SerializedConsoleView {
        return {type: ConsoleView.type};
    }

    public destroy() { }

    public doLayout() { }

    private output = (event: logger.LogEvent) => {
        this.scrollback.append($('<div>').text(logger.formatTimestamp(event.timestamp) + " [" + event.source + "] " + event.message));
        this.scrollback[0].scrollTop = this.scrollback[0].scrollHeight;
    };
}

interface SerializedConsoleView extends SerializedView { }


serialization.viewClasses[ConsoleView.type] = ConsoleView;
