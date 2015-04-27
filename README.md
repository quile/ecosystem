# ecosystem

## Managed lifecycle and dependency injection for your application components

Node.js can be a bit like the wild west when it comes to organising your
application structure.  Although 'require' goes a long way toward
helping you have a good layout, it is not particularly useful when
it comes to questions of application lifecycle.  That's where this
project comes in.

## Outline

Node's asynchronous nature can make it difficult to be certain that
all of your resources are started and running before you start
using them.  Using _lifecycle_, you can specify how your 
application elements depend on each other and you can be guaranteed that
any dependencies will be initialised and started in the right
order.  For example, if module A depends on modules B and C, and
C depends on D, then the system will initialise D first, then C
and B, then finally A.

## Usage

Using it is a simple matter of having an object that inherits
from the *Lifecycle* class, and, if you want, overriding any of the
lifecycle methods.

```javascript
    var Lifecycle = require("ecosystem").Lifecycle;
    var util      = require("util");

    // You need a constructor that calls the Lifecycle constructor
    function MyService(name) {
        Lifecycle.call(this, name);
    }
    // ... and you need to inherit from Lifecycle
    util.inherits(MyService, Lifecycle);
    ...

    // ... and if you export your class as "Lifecycle", ecosystem
    // will know how to init/start/stop it easily
    module.exports = {
        Lifecycle: MyService,
        ...
    };
```

There are four methods that your modules can override to implement
their _lifecycle_ behaviours:

* dependencies() - return an array of names of modules that this module
depends on.  The dependencies will be initialised before this module.

* init(config, modules, next) - this will be invoked if present on
your module, allowing your component to initialise itself from
config values, set up various parameters, and so on.  This will
only be called once.  You *must* call the next() function when you
are done, or the init call-chain will terminate.

* start(next) - here you can actually start your service, connect to a
database, set up timers, etc.  When you are done, you must invoke the
next() function in order for the start call-chain to continue.

* stop(next) - This will be called when the service is being stopped. Note
that a service will only be stopped after all its dependencies are stopped.
You must call next() or the stop call-chain will terminate.

## Quick 'n' Dirty

Build a dictionary of name-to-component mappings:

```javascript
        var modules = {
            foo: InstanceOfFoo,
            bar: InstanceOfBar,
            ...
        };
```

Initialise them all this way:

```javascript
        ecosystem.initAll(config, modules, function() {
            // this will be called when all modules have been initialised
        });
```

Start them all

```javascript
            ecosystem.startAll(modules, function() {
                // this will be called when all modules
                // have been successfully started
            });
```

Stop them when you're done

```javascript
                ecosystem.stopAll(modules, function() {
                    // This will be called when all
                    // modules have been stopped.
                });
```

So all together:

```javascript
    ecosystem.initAll(config, modules, function() {
        // this will be called when all modules have been initialised
        ecosystem.startAll(modules, function() {
            // this will be called when all modules
            // have been successfully started
            ecosystem.stopAll(modules, function() {
                // This will be called when all
                // modules have been stopped.
            });
        });
    });
```

Note that the config should only be passed into the initAll()
function; modules can take what they need from the config during
initialisation.

## Real-World Example
### A MySQL service

Here's an example MySQL service that other modules can declare as a dependency.
Then all dependent modules can be assured that when their start() method is called,
this service's start() method has already been called.  You can find this example in
the examples/mysql directory.

```javascript
    var mysql = require("mysql");
    var util  = require("util");
    var _     = require("underscore");

    var Lifecycle = require("ecosystem").Lifecycle;

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

        ... your own methods here to talk to the service,
        ... run queries, etc. etc.
    });

    module.exports = {
        Lifecycle: MySQL
    };
```

Now you can use this service from your other code:

```javascript
    var _         = require("underscore");
    var util      = require("util");
    var Lifecycle = require("ecosystem").Lifecycle;

    function FooService(name) {
        Lifecycle.call(this, name);
        ...
    }

    util.inherits(FooService, Lifecycle);

    _.extend(FooService.prototype, {

        dependencies: function() {
            // if you use loadAll() to load dependencies, you declare
            // them using the path that they were "require"d with.
            // Otherwise, you just use the name that they were constructed
            // with.
            return [ "./mysql", "./something-else",  ];
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

        ... More FooService stuff here
    });

    module.exports = {
        Lifecycle: FooService
    };
```

In your FooService's start() method, you can see that it can access
its "mysql" dependency by name, and then call methods on it.  The MySQL
service's start() method will have already been called and if all went
well, the connection will be live and ready.

There are many ways to start all your services, but here's one easy way
to do it:

```javascript
    // app.js
    var ecosystem = require("ecosystem");

    // Presumably you'd pull this in from a file or something:
    var config = {
        mysql: {
            host: "localhost",
            user: "sneelock",
            password: ...
            database: "circus"
        },
        ...
    };
    
    var moduleNames = [
        './mysql',
        './foo',
    ];

    // This convenience will "require" all the listed
    // modules and create uninitialised instances of
    // all of them.  You don't have to use this but it
    // saves a lot of boilerplate.
    var modules = ecosystem.loadAll(moduleNames);

    // This is a standard pattern to initialise your
    // modules first, then once that succeeds, you
    // can start them all.
    ecosystem.initAll(config, modules, function() {
        ecosystem.startAll(modules, function() {
            console.log("All modules started.");
        });
    });

    // Trap termination signals and close gracefully
    function terminate() {
        console.log('Shutting down...');
        ecosystem.stopAll(modules);
        setTimeout(process.exit, 2000);
    }
    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
```

## TODO

* Write some decent documentation

## Acknowledgements

This is loosely based on the awesome Clojure project,
[component](https://github.com/stuartsierra/component),
by Stuart Sierra.
