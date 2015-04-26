var mysql = require("mysql");
var util  = require("util");
var _     = require("underscore");

var Lifecycle = require("../../ecosystem").Lifecycle;

// Construct the service
function MySQL(name) {
    Lifecycle.call(this, name);
    this._connection = null;
}

util.inherits(MySQL, Lifecycle);

// Your service can optionally implement any of these
// lifecycle methods:
//
// * init(config, modules, next)
// * start(next)
// * stop(next)

_.extend(MySQL.prototype, {

    // init is guaranteed to be called before the init() of any
    // modules that depend on this module.
    init: function(config, modules, next) {
        this._connection = mysql.createConnection(config.mysql);
        next();
    },

    // start is guaranteed to be called before the start() of
    // any modules that depend on this module; this means that
    // a dependent module can assume that the MySQL connection
    // will be alive and can use it within the start() method.
    start: function(next) {
        var that = this;

        this._connection.connect(function(err) {
            if (err) {
                console.error(err);
                throw new Error(err);
            }
            console.log("MySQL connected.");
            next();
        });
    },

    stop: function(next) {
        this._connection.end(function(err) {
            console.log("MySQL connection closed.");
            next();
        });
    },

    doSomeStuff: function(next) {
        console.log("MySQL.doSomeStuff() called");
        next();
    }
});

module.exports = {
    Lifecycle: MySQL
};
