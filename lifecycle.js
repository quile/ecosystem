var util   = require("util");
var events = require("events");
var _      = require("underscore");

var lifecycle = {
    STATUS_NEW:          "new",
    STATUS_INITIALISING: "initialising",
    STATUS_INITIALISED:  "initialised",
    STATUS_STARTING:     "starting",
    STATUS_STARTED:      "started",
    STATUS_STOPPING:     "stopping",
    STATUS_STOPPED:      "stopped",
};

function Lifecycle(name) {
    this._lifecycle_name = name;
    this._lifecycle = {
        status: lifecycle.STATUS_UNINITIALISED,
        dependencies: {},
        depending: [],
    };
}

util.inherits(Lifecycle, events.EventEmitter);

_.extend(Lifecycle.prototype, {
    dependencies: function() {
        return [];
    },

    _lifecycle_dependencies: function() {
        if (_.isFunction(this.lifecycle_dependencies)) {
            return this.lifecycle_dependencies();
        }
        return this.dependencies();
    },

    lifecycle_dependency: function(name) {
        var m = null;
        // TODO: make this resolution smarter
        var re = new RegExp(name + "$");
        _(this._lifecycle.dependencies).each(function(dep, name) {
            if (!m && name.match(re)) {
                m = dep;
            }
        });
        return m;
    },

    _wrap: function(selector) {

    },

    _init: function(config, all, next) {
        var self = this;

        if (self.lifecycleStatus() === lifecycle.STATUS_INITIALISING) {
            // error?
            console.error("Error: circular dependency discovered.");
            return;
        }

        if (self.lifecycleStatus() === lifecycle.STATUS_INITIALISED) {
            // already initialised, we can continue
            return next();
        }

        self._lifecycle_resolveDependencies(all);

        console.log("Initialising " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_INITIALISING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_init",
                                [config, all],
            function() {
                var forward = function() {
                    self.setLifecycleStatus(lifecycle.STATUS_INITIALISED);
                    self.emit("init");
                    console.log("Initialised " + self._lifecycle_name);
                    next();
                };
                if (_.isFunction(self.init)) {
                    self.init(forward);
                } else {
                    forward();
                }
            }
        );
    },
    _start: function(next) {
        var self = this;

        if (self.lifecycleStatus() === lifecycle.STATUS_STARTED) {
            // already started, we can continue
            return next();
        }
        console.log("Starting " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_STARTING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_start", [],
            function() {
                var forward = function () {
                    self.setLifecycleStatus(lifecycle.STATUS_STARTED);
                    self.emit("start");
                    console.log("Started " + self._lifecycle_name);
                    next();
                };
                if (_.isFunction(self.start)) {
                    self.start(forward);
                } else {
                    forward();
                }
            }
        );
    },
    _stop: function(next) {
        var self = this;

        if (self.lifecycleStatus() === lifecycle.STATUS_STOPPED) {
            return next();
        }
        console.log("Stopping " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_STOPPING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_stop", [],
            function() {
                var forward = function() {
                    self.setLifecycleStatus(lifecycle.STATUS_STOPPED);
                    self.emit("stop");
                    console.log("Stopped " + self._lifecycle_name);
                    next();
                };
                if (_.isFunction(self.stop)) {
                    self.stop(forward);
                } else {
                    forward();
                }
            }
        );
    },

    _lifecycle_resolveDependencies: function(modules) {
        var self = this;
        _(this._lifecycle_dependencies()).each(function(name) {
            var m = modules[name];
            if (!m) {
                throw new Error("No such module: " + name);
            }
            self._lifecycle.dependencies[name] = m;
            self._lifecycle.depending.push(m);
        });
    },

    _lifecycle_whenAll: function(modules, selector, args, next) {
        var count = 0;
        var total = _(modules).keys().length;
        if (total === 0) {
            return next();
        }
        var countFunction = function() {
            count++;
            if (count === total) {
                next();
            }
        };
        args.push(countFunction);
        _(modules).each(function(m) {
            if (m[selector] && _.isFunction(m[selector])) {
                m[selector].apply(m, args);
            }
        });
    },

    lifecycleStatus: function() {
        return this._lifecycleStatus;
    },

    setLifecycleStatus: function(v) {
        this._lifecycleStatus = v;
    },
});

module.exports = _.extend({
    Lifecycle: Lifecycle,
}, lifecycle);
