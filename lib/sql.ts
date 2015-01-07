import _ = require("lodash");
import Promise = require("bluebird");


export function insert(db: any, table: string, values: any) {
    var query = "INSERT INTO " + table + " (" +
        _.keys(values).join(", ") + ") VALUES (" +
        _.map(_.range(1, _.size(values) + 1), n => "$" + n).join(", ") + ")";
    return Promise.promisify(db.query, db)(query, _.values(values));
}

export function update(db: any, table: string, pivots: any, values: any) {
    var query = "UPDATE " + table + " SET " +
        _.map(_.keys(values), (k, i) => k + " = $" + (i + 1).toString()).join(", ") +
        " WHERE " + _.map(_.keys(pivots), (k, i) => k + " = $" + (i + _.size(values) + 1).toString()).join(" AND ");
    var args = _.values(values).concat(_.values(pivots));
    return Promise.promisify(db.query, db)(query, args);
}

export function upsert(db: any, table: string, pivots: any, values: any) {
    return update(db, table, pivots, values).nodeify((err: any, result: any) => {
        if (result && result.rowCount)
            return result;
        return insert(db, table, _.extend({}, pivots, values));
    });
}
