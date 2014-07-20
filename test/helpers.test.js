var sira = require('sira');
var helpers = require('../');
var assert = require('chai').assert;

describe('helpers', function () {

    var sapp = sira();
    sapp.registry.define('xxx-test-model', {}, function (Model) {
        sira.expose.model(Model);
    });
    sapp.phase(sira.boot.module('sira-core'));
    sapp.phase(sira.boot.database());
    sapp.phase(function () {
        sapp.use(sapp.dispatcher);
        sapp.use(function (ctx) {
            if (!ctx.handled) throw new Error('Unhandled Request For: ' + ctx.request.uri);
        });
    });
    sapp.boot(function (err) {
        if (err) throw err;
    });

    helpers.beforeEach.withSapp(sapp);

    describe('helpers.it', function () {
        ['shouldBeAllowed', 'shouldBeDenied']
            .forEach(function (func) {
                it('should have a method named ' + func, function () {
                    assert.equal(typeof helpers.it[func], 'function');
                });
            });
    });

    describe('helpers.describe', function () {
        ['staticMethod', 'whenLoggedInAsUser', 'whenCalledAnonymously']
            .forEach(function (func) {
                it('should have a method named ' + func, function () {
                    assert.equal(typeof helpers.describe[func], 'function');
                });
            });
    });

    describe('helpers.beforeEach', function () {
        ['withArgs', 'givenModel', 'givenUser']
            .forEach(function (func) {
                it('should have a helper method named ' + func, function () {
                    assert.equal(typeof helpers.beforeEach[func], 'function');
                });
            });
    });

    describe('helpers.beforeEach.givenModel', function () {
        helpers.beforeEach.givenModel('xxx-test-model');
        it('should have an xxx-test-model property', function () {
            assert(this['xxx-test-model']);
            assert(this['xxx-test-model'].id);
        });
    });

    describe('whenCalledLocally', function () {
        helpers.describe.staticMethod('create', function () {
            helpers.beforeEach.withArgs({foo: 'bar'});
            helpers.describe.whenCalledLocally('xxx-test-models.create', function () {
                it('should call the method', function (done) {
                    done(this.err);
                });
            });
        });
    });
});
