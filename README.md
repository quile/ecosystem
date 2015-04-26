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

    var Lifecycle = require("ecosystem").Lifecycle;
    var util      = require("util");

    function MyService(name) {
        Lifecycle.call(this, name);
    }
    util.inherits(MyService, Lifecycle);
    ...

    module.exports = {
        Lifecycle: MyService,
        ...
    };

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

1. Build a dictionary of name-to-component mappings:

    var modules = {
        foo: InstanceOfFoo,
        bar: InstanceOfBar,
        ...
    };

2. Initialise them all this way:

    ecosystem.initAll(config, modules, function() {
        // this will be called when all modules have been initialised
    });

3. Start them all

        ecosystem.startAll(modules, function() {
            // this will be called when all modules
            // have been successfully started
        });

4. Stop them when you're done
            ecosystem.stopAll(modules, function() {
                // This will be called when all
                // modules have been stopped.
            });

So all together:

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

Note that the config should only be passed into the initAll()
function; modules can take what they need from the config during
initialisation.


## TODO

* Write some decent documentation
* Show some real-world examples

## Acknowledgements

This is loosely based on the awesome Clojure project,
[component](https://github.com/stuartsierra/component),
by Stuart Sierra.
