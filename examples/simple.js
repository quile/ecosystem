var util = require("util");
var _    = require("underscore");

var lifecycle = require("../lifecycle");


function Foo(name) {
    lifecycle.Lifecycle.call(this, name);
}

util.inherits(Foo, lifecycle.Lifecycle);

_.extend(Foo.prototype, {
    dependencies: function() {
        return [];
    },

    init: function(config, all, next) {
        console.log("Foo init");
        next();
    },

    start: function(next) {
        console.log("Foo start");
        next();
    },

    stop: function(next) {
        console.log("Foo stop");
        next();
    },
});

function Bar(name) {
    lifecycle.Lifecycle.call(this, name);
}

util.inherits(Bar, lifecycle.Lifecycle);

_.extend(Bar.prototype, {
    dependencies: function() {
        return [ 'foo' ];
    },

    init: function(config, all, next) {
        console.log("Bar init");
        next();
    },

    start: function(next) {
        console.log("Bar start");
        next();
    },

    stop: function(next) {
        console.log("Bar stop");
        next();
    },
});

function Baz(name) {
    lifecycle.Lifecycle.call(this, name);
}

util.inherits(Baz, lifecycle.Lifecycle);

_.extend(Baz.prototype, {
    lifecycle_dependencies: function() {
        return [ 'foo', 'bar' ];
    },

    init: function(config, all, next) {
        console.log("Baz init");
        next();
    },

    start: function(next) {
        console.log("Baz start");
        next();
    },

    stop: function(next) {
        console.log("Baz stop");
        next();
    },
});


var foo = new Foo("foo");
var bar = new Bar("bar");
var baz = new Baz("baz");

baz._init({}, { foo: foo, bar: bar, baz: baz }, function() {
    console.log("Finished initialising.");
    baz._start(function() {
        console.log("Finished starting.");
        baz._stop(function() {
            console.log("Finished stopping.");
        });
    });
});
