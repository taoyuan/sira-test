"use strict";

var sira = require('sira');
var assert = require('chai').assert;

var _describe = {};
var _it = {};
var _beforeEach = {};
var helpers = exports = module.exports = {
    describe: _describe,
    it: _it,
    beforeEach: _beforeEach
};

function merge(into, obj) {
    if (!into || !obj) return into;
    var objs = [].slice.call(arguments, 1);
    objs.forEach(function (obj) {
        if (!obj) return;
        Object.keys(obj).forEach(function (key) {
            if (obj.hasOwnProperty(key)) {
                into[key] = obj[key];
            }
        });
    });
    return into;
}

_beforeEach.withSapp = function (sapp) {
    if (sapp.models.User) {
        // Speed up the password hashing algorithm
        sapp.models.User.settings.saltWorkFactor = 4;
    }

    beforeEach(function () {
        var test = this;
        test.sapp = sapp;
    });
};


_describe.staticMethod = function (methodName, cb) {
    describe('.' + methodName, function () {
        beforeEach(function () {
            var test = this;
            test.method = methodName;
            test.isStaticMethod = true;
        });
        cb();
    });
};

_describe.instanceMethod = function (methodName, cb) {
    describe('.prototype.' + methodName, function () {
        beforeEach(function () {
            var test = this;
            test.method = methodName;
            test.isInstanceMethod = true;
        });
        cb();
    });
};

_beforeEach.withArgs = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    beforeEach(function () {
        var test = this;
        test.args = args;
    });
};


_beforeEach.givenModel = function (modelName, attrs, optionalHandler) {
    var modelKey = modelName;

    if (typeof attrs === 'function') {
        optionalHandler = attrs;
        attrs = undefined;
    }

    if (typeof optionalHandler === 'string') {
        modelKey = optionalHandler;
    }

    attrs = attrs || {};

    beforeEach(function (done) {
        var test = this;
        var sapp = test.sapp;
        var model = sapp.model(modelName);
        assert(model, 'cannot get model of name ' + modelName + ' from app.models');
        assert(model.schema, 'cannot test model ' + modelName + ' without schema');
        assert(typeof model.create === 'function', modelName + ' does not have a create method');

        model.create(attrs, function (err, result) {
            if (err) {
                console.error(err.message);
                if (err.details) console.error(err.details);
            } else {
                test[modelKey] = result;
            }
            done(err);
        });
    });

    if (typeof optionalHandler === 'function') {
        beforeEach(optionalHandler);
    }

    afterEach(function (done) {
        this[modelKey].destroy(done);
    });
};

_beforeEach.givenUser = function (attrs, optionalHandler) {
    _beforeEach.givenModel('user', attrs, optionalHandler);
};

_beforeEach.givenLoggedInUser = function (credentials, optionalHandler) {
    _beforeEach.givenUser(credentials, function (done) {
        var test = this;
        test.user.constructor.login(credentials, function (err, token) {
            if (err) return done(err);
            test.loggedInAccessToken = token;
            done();
        });
    });

    afterEach(function (done) {
        var test = this;
        test.loggedInAccessToken.destroy(function (err) {
            if (err) return done(err);
            test.loggedInAccessToken = undefined;
            done();
        });
    });
};

_beforeEach.givenAnUnauthenticatedToken = function (attrs, optionalHandler) {
    _beforeEach.givenModel('accessToken', attrs, optionalHandler);
};

_beforeEach.givenAnAnonymousToken = function (attrs, optionalHandler) {
    _beforeEach.givenModel('accessToken', {id: '$anonymous'}, optionalHandler);
};


_describe.whenCalledLocally = function (uri, data, cb) {
    if (cb == undefined) {
        cb = data;
        data = null;
    }

    var uriStr = uri;
    if (typeof uri === 'function') {
        uriStr = '<dynamic>';
    }

    describe('handle ' + uriStr, function () {
        beforeEach(function (cb) {
            if (typeof uri === 'function') {
                uri = uri.call(this);
            }

            var test = this;

            if (typeof uri === 'object') {
                data = uri.data;
                uri = uri.uri;
            }
            data = merge({}, test.data, data);

            var payload = data || {};
            if (typeof data === 'function') {
                payload = data.call(this);
            }
            var rek = sira.rekuest(uri, payload);

            if (this.loggedInAccessToken) {
                rek.prop('accessToken', test.loggedInAccessToken);
            }

            rek.send(test.sapp, function (err, result) {
                test.err = err;
                test.result = result;
                cb();
            });

        });

        cb();
    });
};


_describe.whenLoggedInAsUser = function (credentials, cb) {
    describe('when logged in as user', function () {
        _beforeEach.givenLoggedInUser(credentials);
        cb();
    });
};

_describe.whenCalledByUser = function (credentials, uri, data, cb) {
    describe('when called by logged in user', function () {
        _beforeEach.givenLoggedInUser(credentials);
        _describe.whenCalledLocally(uri, data, cb);
    });
};

_describe.whenCalledAnonymously = function (uri, data, cb) {
    describe('when called anonymously', function () {
        _beforeEach.givenAnAnonymousToken();
        _describe.whenCalledLocally(uri, data, cb);
    });
};

_describe.whenCalledUnauthenticated = function (uri, data, cb) {
    describe('when called with unauthenticated token', function () {
        _beforeEach.givenAnAnonymousToken();
        _describe.whenCalledLocally(uri, data, cb);
    });
};

_it.shouldBeAllowed = function () {
    it('should be allowed', function () {
        assert(!this.err);
    });
};

_it.shouldBeDenied = function () {
    it('should not be allowed', function () {
        assert(this.err);
        var expectedStatus = this.aclErrorStatus ||
            this.sapp && this.sapp.options['aclErrorStatus'] ||
            401;
        assert.equal(this.err.statusCode, expectedStatus);
    });
};

_it.shouldNotBeFound = function () {
    it('should not be found', function () {
        assert(this.err);
        assert.equal(this.err.statusCode, 404);
    });
};

_it.shouldBeAllowedWhenCalledAnonymously = function (uri, data) {
    _describe.whenCalledAnonymously(uri, data, function () {
        _it.shouldBeAllowed();
    });
};

_it.shouldBeDeniedWhenCalledAnonymously = function (uri) {
    _describe.whenCalledAnonymously(uri, function () {
        _it.shouldBeDenied();
    });
};

_it.shouldBeAllowedWhenCalledUnauthenticated = function (uri, data) {
    _describe.whenCalledUnauthenticated(uri, data, function () {
        _it.shouldBeAllowed();
    });
};

_it.shouldBeDeniedWhenCalledUnauthenticated = function (uri) {
    _describe.whenCalledUnauthenticated(uri, function () {
        _it.shouldBeDenied();
    });
};

_it.shouldBeAllowedWhenCalledByUser = function (credentials, uri, data) {
    _describe.whenCalledByUser(credentials, uri, data, function () {
        _it.shouldBeAllowed();
    });
};

_it.shouldBeDeniedWhenCalledByUser = function (credentials, uri) {
    _describe.whenCalledByUser(credentials, uri, function () {
        _it.shouldBeDenied();
    });
};


