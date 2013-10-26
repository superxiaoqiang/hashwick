import context_ = require("./context");
if (0) context_;
import DeserializationContext = context_.DeserializationContext;
import interfaces_ = require("./interfaces");
if (0) interfaces_;
import DataSourceClass = interfaces_.DataSourceClass;
import SerializedDataSource = interfaces_.SerializedDataSource;


export var dataSourceClasses: { [type: string]: DataSourceClass } = {};

export function deserializeDataSource(context: DeserializationContext, structure: SerializedDataSource) {
    return dataSourceClasses[structure.type].deserialize(context, structure);
}
