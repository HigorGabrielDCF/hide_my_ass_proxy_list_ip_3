// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("data.sqlite");

function initDatabase() {
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (name TEXT)");
	});
}

function updateRow(db, value) {
	var statement = db.prepare("INSERT INTO data VALUES (?)");
	statement.run(value);
	statement.finalize();
}

function readRows(db) {
	db.each("SELECT rowid AS id, name FROM data", function(err, row) {
		console.log(row.id + ": " + row.name);
	});
}

function fetchPage(url, callback) {
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

initDatabase();

var request = require('request');

var getProxies = function (callback, pageNum, proxiesScraped) {

    if (!proxiesScraped) {
        proxiesScraped = {};
    }

    if (!pageNum){
        pageNum = 1;
    }

    var fakeNums = {};

    request('http://www.hidemyass.com/proxy-list/' + pageNum, function (err, res, body) {
        if (!res || res.statusCode != 200) {
            callback("Response code was not 200");
            return;
        }

        var ips = [];
        var ports = [];
        var types = [];

        body.replace(/\.(.*?)\{display\:none\}/g, function () {
            //arguments[0] is the entire match
            fakeNums[arguments[1]] = 1
        });

        body.replace(/<td>([\S\s]*?)<\/td>/g, function () {
			var str = arguments[1].trim();
            if (str === "HTTP" || str === "HTTPS" || str === "socks4/5")
                types.push(str);
        });

        var trim = body;
        trim = trim.replace(/\s/g, '');

        trim.replace(/<td>([0-9]+)<\/td>/g, function () {
            ports.push(arguments[1])
        });

        body.replace(/{display:inline}[\S\s]?<\/style>([\S\s]*?)<\/td>/g, function () {
            var temp = arguments[1];
            temp = temp.replace(/<span class\=\"(.*?)\">.*?<\/span>/g, function () {
                if (fakeNums[arguments[1]]) {
                    return ''
                }
                return arguments[0]
            });
            temp = temp.replace(/<span style\=\"display\:none\">(.*?)<\/span>/g, "");
            temp = temp.replace(/<div style\=\"display\:none\">(.*?)<\/div>/g, "");
            temp = temp.replace(/<(.*?)>/g, '');
			temp = temp.trim();
            ips.push(temp)
        });
        var count = 0;

        if (ips.length > 0) {
            if (ports.length == 0 || ports.length != ips.length || ips.length != types.length){
                callback("Regex parsing has failed.");
                return;
            }

            for (var i = 0; i < ips.length; i++) {
                if (types[i] == 'HTTP' || types[i] == 'HTTPS') {
                    count++;
                    proxiesScraped[ips[i]] = ports[i]
                }
            }

            console.log('collected ' + count + ' http proxies from page ' + pageNum);

            getProxies(callback, pageNum + 1, proxiesScraped)
        }
        else {
            callback(null,proxiesScraped)
        }

    })
};

module.exports = {getProxies: getProxies};
updateRow(db, module.exports);
readRows(db);
db.close();
