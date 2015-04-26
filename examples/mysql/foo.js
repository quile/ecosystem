var _         = require("underscore");
var util      = require("util");
var Lifecycle = require("../../ecosystem").Lifecycle;

function FooService(name) {
    Lifecycle.call(this, name);
}

util.inherits(FooService, Lifecycle);

_.extend(FooService.prototype, {

    dependencies: function() {
        return [ "./mysql" ];
    },

    init: function(config, modules, next) {
        console.log("Foo service initialised");
        next();
    },

    start: function(next) {
        // Here we are guaranteed to have a live mysql
        // connection (assuming nothing went wrong).
        var mysql = this.dependency("mysql");
        mysql.doSomeStuff(function() {
            next();
        });
    },

    stop: function(next) {
        console.log("Foo service stopped.");
        next();
    }
});

module.exports = {
    Lifecycle: FooService
};
