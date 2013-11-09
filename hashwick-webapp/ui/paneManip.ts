import geometry_ = require("../utils/geometry");
import Rectangle = geometry_.Rectangle;
import paneDefs_ = require("./paneDefs");
import SerializedPane = paneDefs_.SerializedPane;
import SerializedSplitPane = paneDefs_.SerializedSplitPane;


export interface PositionIterator {
    (child: SerializedPane, bounds: Rectangle, index: number): void;
}


export function enumChildPositions(
        pane: SerializedPane, bounds: Rectangle, iterator: PositionIterator) {
    if (pane.type === "splitVert") {
        var splitPane = <SerializedSplitPane>pane;
        var totalSizeWeight = _.reduce(splitPane.children, (a, c) => a + c.sizeWeight, 0);
        var curSizeWeight = 0;
        _.each(splitPane.children, (child, index) => {
            var childBounds = {
                left: bounds.left + bounds.width * curSizeWeight / totalSizeWeight,
                top: bounds.top,
                width: bounds.width * child.sizeWeight / totalSizeWeight,
                height: bounds.height,
            };
            iterator(child.pane, childBounds, index);
            curSizeWeight += child.sizeWeight;
        });
    } else if (pane.type === "splitHorz") {
        var splitPane = <SerializedSplitPane>pane;
        var totalSizeWeight = _.reduce(splitPane.children, (a, c) => a + c.sizeWeight, 0);
        var curSizeWeight = 0;
        _.each(splitPane.children, (child, index) => {
            var childBounds = {
                left: bounds.left,
                top: bounds.top + bounds.height * curSizeWeight / totalSizeWeight,
                width: bounds.width,
                height: bounds.height * child.sizeWeight / totalSizeWeight,
            };
            iterator(child.pane, childBounds, index);
            curSizeWeight += child.sizeWeight;
        });
    }
}


export function joinIntoSplitPane(existingPane: SerializedSplitPane,
                                  index: number, edge: string, newPane: SerializedPane) {
    if (existingPane.type === "splitVert" && (edge === "left" || edge === "right")) {
        addToExistingSplitPane(existingPane, index, edge === "right", newPane);
    } else if (existingPane.type === "splitHorz" && (edge === "top" || edge === "bottom")) {
        addToExistingSplitPane(existingPane, index, edge === "bottom", newPane);
    } else {
        var split = createSplitPane(existingPane.children[index].pane, edge, newPane);
        existingPane.children[index].pane = split;
    }
}

export function createSplitPane(existingPane: SerializedPane,
                                newEdge: string, newPane: SerializedPane) {
    var newAfterExisting = newEdge === "right" || newEdge === "bottom";
    var childPanes = newAfterExisting ? [existingPane, newPane] : [newPane, existingPane];
    var children = _.map(childPanes, p => { return {pane: p, sizeWeight: 1}; });
    var vertical = newEdge === "left" || newEdge === "right";
    return {type: vertical ? "splitVert" : "splitHorz", children: children};
}

function addToExistingSplitPane(existingPane: SerializedSplitPane,
                                index: number, trailing: boolean, newPane: SerializedPane) {
    var existingChild = existingPane.children[index];
    var weight = existingChild.sizeWeight /= 2;
    var newChild = {pane: newPane, sizeWeight: weight};
    existingPane.children.splice(index + <any>trailing, 0, newChild);
}
