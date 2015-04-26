// app.js
var ecosystem = require("../../ecosystem");

// Presumably you'd pull this in from a file or something:
var config = {
    mysql: {
        host: "localhost",
        user: "sneelock",
        password: "...",
        database: "circus-mcgurkus"
    },
};

var moduleNames = [
    './mysql',
    './foo',
];

// This convenience will "require" all the listed
// modules and create uninitialised instances of
// all of them.  You don't have to use this but it
// saves a lot of boilerplate.
var modules = ecosystem.loadAll(moduleNames, __dirname);

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
