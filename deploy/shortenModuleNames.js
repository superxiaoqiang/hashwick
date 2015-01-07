var fs = require("fs");

var _ = require("lodash");
var Promise = require("bluebird");


var filename = process.argv[2];

Promise.promisify(fs.readFile)(filename, {encoding: "utf8"})
    .then(function (source) {
        var re = /var\s+\w+\s*=\s*require\("([^"]+)"\)/g;
        var modules = {};
        var m;
        while (m = re.exec(source))
            modules[m[1]] = true;

        var i = 0;
        _.each(_.keys(modules), function (name) {
            var re = new RegExp('"' + name + '"', "g");
            source = source.replace(re, (++i).toString());
        });

        return Promise.promisify(fs.writeFile)(filename, source, {encoding: "utf8"});
    }).done();
