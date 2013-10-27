import _ = require("underscore");


export interface Callback {
    (err: any, result: any): void;
}

export function insert(db: any, table: string, values: any, callback: Callback) {
    var query = "INSERT INTO " + table + " (" +
        _.keys(values).join(", ") + ") VALUES (" +
        _.map(_.range(1, _.size(values) + 1), n => "$" + n).join(", ") + ")";
    db.query(query, _.values(values), callback);
}

export function update(db: any, table: string, pivots: any, values: any, callback: Callback) {
    var query = "UPDATE " + table + " SET " +
        _.map(_.keys(values), (k, i) => k + " = $" + (i + 1).toString()).join(", ") +
        " WHERE " + _.map(_.keys(pivots), (k, i) => k + " = $" + (i + _.size(values) + 1).toString()).join(" AND ");
    db.query(query, _.values(values).concat(_.values(pivots)), callback);
}

export function upsert(db: any, table: string, pivots: any, values: any, callback?: Callback) {
    update(db, table, pivots, values, (err: any, result: any) => {
        if (result && result.rowCount)
            return callback && callback(err, result);
        insert(db, table, _.extend({}, pivots, values), callback);
    });
}
