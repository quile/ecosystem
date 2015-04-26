var assert    = require("assert");
var util      = require("util");
var _         = require("underscore");
var ecosystem = require("../ecosystem");

describe("plain module", function() {
    it("creates and starts a single module", function(done) {
        var Test = function(name) {ecosystem.Lifecycle.call(this, name);};
        util.inherits(Test, ecosystem.Lifecycle);
        var test = new Test("test");
        ecosystem.initAll({}, { test: test }, function() {
            done();
        });
    })
});

describe("simple dependency", function() {
    it("creates and starts two dependent modules", function(done) {
        var TestA = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestB = function(name) {ecosystem.Lifecycle.call(this, name);};
        util.inherits(TestA, ecosystem.Lifecycle);
        util.inherits(TestB, ecosystem.Lifecycle);
        _.extend(TestA.prototype, {
            dependencies: function() { return [ "testb" ] }
        });
        var testa = new TestA("testa");
        var testb = new TestB("testb");

        ecosystem.initAll({}, { testa: testa, testb: testb }, function() {
            done();
        });
    });
});

describe("complex dependencies", function() {
    it("sets up a dependency tree correctly", function(done) {
        var TestA = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestB = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestC = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestD = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestE = function(name) {ecosystem.Lifecycle.call(this, name);};
        util.inherits(TestA, ecosystem.Lifecycle);
        util.inherits(TestB, ecosystem.Lifecycle);
        util.inherits(TestC, ecosystem.Lifecycle);
        util.inherits(TestD, ecosystem.Lifecycle);
        util.inherits(TestE, ecosystem.Lifecycle);
        _.extend(TestA.prototype, { dependencies: function() { return [ "testb" ] }});
        _.extend(TestB.prototype, { dependencies: function() { return [ "testc", "testd" ] }});
        _.extend(TestD.prototype, { dependencies: function() { return [ "teste" ] }});
        var testa = new TestA("testa");
        var testb = new TestB("testb");
        var testc = new TestC("testc");
        var testd = new TestD("testd");
        var teste = new TestE("teste"); // haha

        var modules = {
            testa: testa,
            testb: testb,
            testc: testc,
            testd: testd,
            teste: teste
        };

        ecosystem.initAll({}, modules, function() {
            assert.equal(testa.dependency("testb"), testb);
            assert.equal(testb.dependency("testc"), testc);
            assert.equal(testb.dependency("testd"), testd);
            assert.equal(testd.dependency("teste"), teste);
            done();
        });
    });
});

describe("circular dependencies", function() {
    it("throws when a circular dependency is found", function() {
        var TestA = function(name) {ecosystem.Lifecycle.call(this, name);};
        var TestB = function(name) {ecosystem.Lifecycle.call(this, name);};
        util.inherits(TestA, ecosystem.Lifecycle);
        util.inherits(TestB, ecosystem.Lifecycle);
        _.extend(TestA.prototype, { dependencies: function() { return [ "testb" ] }});
        _.extend(TestB.prototype, { dependencies: function() { return [ "testa" ] }});
        var testa = new TestA("testa");
        var testb = new TestB("testb");

        assert.throws(
            function() {
                ecosystem.initAll({}, { testa: testa, testb: testb }, function() {});
            },
            function(err) {
                if (err instanceof Error && /circular/.test(err)) {
                    return true;
                }
            },
            "Got unexpected error"
        );
    });
});

describe("init, start and stop", function() {
    it("calls init, start and stop on the module", function(done) {
        var TestA = function(name) {ecosystem.Lifecycle.call(this, name);};
        util.inherits(TestA, ecosystem.Lifecycle);
        _.extend(TestA.prototype, {
            init: function(config, modules, next) {
                this._initCalled = true;
                next();
            },
            start: function(next) {
                this._startCalled = true;
                next();
            },
            stop: function(next) {
                this._stopCalled = true;
                next();
            }
        });
        var testa = new TestA("testa");
        var modules = { testa: testa };
        ecosystem.initAll({}, modules, function() {
            ecosystem.startAll(modules, function() {
                ecosystem.stopAll(modules, function() {
                    assert(testa._initCalled);
                    assert(testa._startCalled);
                    assert(testa._stopCalled);
                    done();
                });
            });
        });
    });
});
