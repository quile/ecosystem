// =================================================
// ecosystem - lifecycle control and dependency
// injection for node.js apps.  This will help you.
// =================================================

var util   = require("util");
var events = require("events");
var path   = require("path");
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

    dependency: function(name) {
        return this.lifecycle_dependency(name);
    },

    _init: function(config, all, next) {
        var self = this;

        if (self.lifecycleStatus() === lifecycle.STATUS_INITIALISING) {
            throw new Error("Error: circular dependency discovered.");
        }

        if (self.lifecycleStatus() === lifecycle.STATUS_INITIALISED) {
            // already initialised, we can continue
            return next();
        }

        self._lifecycle_resolveDependencies(all);

        // console.log("Initialising " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_INITIALISING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_init",
                                [config, all],
            function() {
                var forward = function() {
                    self.setLifecycleStatus(lifecycle.STATUS_INITIALISED);
                    self.emit("init");
                    // console.log("Initialised " + self._lifecycle_name);
                    next();
                };
                if (_.isFunction(self.init)) {
                    self.init(config, all, forward);
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
        // console.log("Starting " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_STARTING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_start", [],
            function() {
                var forward = function () {
                    self.setLifecycleStatus(lifecycle.STATUS_STARTED);
                    self.emit("start");
                    // console.log("Started " + self._lifecycle_name);
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
        // console.log("Stopping " + self._lifecycle_name);
        self.setLifecycleStatus(lifecycle.STATUS_STOPPING);

        self._lifecycle_whenAll(_(self._lifecycle.dependencies).values(),
                                "_stop", [],
            function() {
                var forward = function() {
                    self.setLifecycleStatus(lifecycle.STATUS_STOPPED);
                    self.emit("stop");
                    // console.log("Stopped " + self._lifecycle_name);
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
        var self = this;
        var _mods = _(modules).clone();

        var _drain = function() {
            var mod = _mods.shift();
            if (!mod) {
                return next();
            }
            if (_.isFunction(mod[selector])) {
                mod[selector].apply(mod, args);
            }
        };
        args.push(_drain);
        _drain();
    },

    lifecycleStatus: function() {
        return this._lifecycleStatus;
    },

    setLifecycleStatus: function(v) {
        this._lifecycleStatus = v;
    },
});

var self = {

    _load: function(moduleName, root) {
        var canonical = moduleName;
        if (root) {
            canonical = path.resolve(root, moduleName);
        }
        // later allow for more advanced path searching, maybe?
        var _m = require(canonical);
        if (!_m || !_m.Lifecycle) {
            log.error('Failed to load %s', moduleName);
            throw('Failed to load ' + moduleName);
        }
        return _m;
    },

    loadAll: function(moduleNames, root) {
        var modules = {};
        _(moduleNames).each(function(name) {
            var _m = self._load(name, root);
            modules[name] = new _m.Lifecycle(name);
        });
        return modules;
    },

    initAll: function(config, modules, next) {
        var _modules = _(modules).values();
        var _init = function() {
            var m = _modules.shift();
            if (!m) { return next() }
            m._init(config, modules, _init);
        };
        _init();
        return self;
    },

    startAll: function(modules, next) {
        next = next || function() {};
        var _modules = _(modules).values();
        var _start = function() {
            var m = _modules.shift();
            if (!m) { return next() }
            m._start(_start);
        };
        _start();
        return self;
    },

    stopAll: function(modules, next) {
        next = next || function() {};
        var _modules = _(modules).values();
        var _stop = function() {
            var m = _modules.shift();
            if (!m) { return next() }
            m._stop(_stop);
        };
        _stop();
        return self;
    }
};

module.exports = _.extend({
    Lifecycle: Lifecycle,
}, self, lifecycle);
