// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"theme.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThemeManager = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// vim: tabstop=4 expandtab shiftwidth=4 softtabstop=4
var DEFAULT_THEME = 'light';
var ThemeManager = /*#__PURE__*/function () {
  function ThemeManager() {
    _classCallCheck(this, ThemeManager);
    this.theme = localStorage.getItem('theme');
    if (this.theme === null) {
      this.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.setTheme(this.theme);
  }
  _createClass(ThemeManager, [{
    key: "setTheme",
    value: function setTheme(theme) {
      this.theme = theme;
      if (theme) {
        if (theme !== DEFAULT_THEME) {
          localStorage.setItem('theme', theme);
        }
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        localStorage.removeItem('theme');
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, {
    key: "clearTheme",
    value: function clearTheme() {
      this.setTheme(null);
    }
  }]);
  return ThemeManager;
}();
exports.ThemeManager = ThemeManager;
},{}],"virtual-keyboard.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VirtualKeyboard = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var VirtualKeyboard = /*#__PURE__*/function (_HTMLElement) {
  _inherits(VirtualKeyboard, _HTMLElement);
  var _super = _createSuper(VirtualKeyboard);
  function VirtualKeyboard(keys) {
    var _this;
    _classCallCheck(this, VirtualKeyboard);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    var style = document.createElement('style');
    style.textContent = "\n            :host { \n                display: flex;\n                flex-direction: column;\n                align-items: center;\n                gap: 5px;\n                cursor: pointer;\n            }\n\n            :host > div {\n                display: flex;\n                gap: 5px;\n                height: 48px;\n            }\n\n            .key {\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                border: solid 1px var(--key-border-color);\n                border-radius: var(--letter-border-radius);\n                background-color: var(--key-background-color);\n                color: var(--key-color);\n                height: 40px;\n                width: 40px;\n                font-size: 24px;\n                text-transform: uppercase;\n                box-sizing: border-box;\n            }\n\n            .control {\n                width: 90px;\n            }\n\n            .disabled {\n                opacity: 0.1;\n            }\n        ";
    shadowRoot.append(style);
    var _iterator = _createForOfIteratorHelper(keys),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var row = _step.value;
        var rowDiv = document.createElement('div');
        var _iterator2 = _createForOfIteratorHelper(row),
          _step2;
        try {
          var _loop = function _loop() {
            var key = _step2.value;
            var keyDiv = document.createElement('div');
            keyDiv.className = "key".concat(key.disabled ? ' disabled' : '').concat(key.control ? ' control' : '');
            keyDiv.textContent = key.value;
            if (!key.disabled) keyDiv.addEventListener('click', function () {
              return _this.keyPress(key.value);
            });
            rowDiv.append(keyDiv);
          };
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            _loop();
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
        shadowRoot.append(rowDiv);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return _this;
  }
  _createClass(VirtualKeyboard, [{
    key: "keyPress",
    value: function keyPress(key) {
      this.dispatchEvent(new CustomEvent('keypress', {
        detail: {
          key: key
        }
      }));
    }
  }]);
  return VirtualKeyboard;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.VirtualKeyboard = VirtualKeyboard;
customElements.define('virtual-keyboard', VirtualKeyboard);
},{}],"game-board.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GameBoard = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var GameBoard = /*#__PURE__*/function (_HTMLElement) {
  _inherits(GameBoard, _HTMLElement);
  var _super = _createSuper(GameBoard);
  function GameBoard(state) {
    var _this;
    var interactive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    _classCallCheck(this, GameBoard);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    var style = document.createElement('style');
    style.textContent = "\n            :host {\n                display: grid;\n                grid-template-rows: repeat(6, 1fr);\n                gap: 5px;\n                ".concat(interactive ? 'margin-left: 110px;' : '', "\n                user-select: none;\n            }\n\n            .row {\n                display: grid;\n                grid-template-columns: repeat(").concat(interactive ? 7 : 5, ", 1fr);\n                gap: 5px;\n            }\n\n            .cell, .key {\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                border-radius: var(--letter-border-radius);\n                height: 50px;\n                width: 50px;\n                font-size: 40px;\n                text-transform: uppercase;\n                box-sizing: border-box;\n                cursor: pointer;\n                box-shadow: var(--letter-box-shadow);\n            }\n\n            .cell {\n                background-color: var(--letter-background-color);\n                border: solid 1px var(--border-color);\n                color: var(--letter-color);\n            }\n\n            .key {\n                background-color: var(--action-background-color);\n                border: solid 1px var(--action-border-color);\n                color: var(--action-color);\n                user-select: none;\n            }\n\n            .start {\n                background-color: var(--letter-background-color-start);\n                border-color: var(--letter-border-color-start);\n                color: var(--letter-color-start);\n                box-shadow: var(--letter-box-shadow-start);\n            }\n\n            .end {\n                background-color: var(--letter-background-color-end);\n                border-color: var(--letter-border-color-end);\n                color: var(--letter-color-end);\n                box-shadow: var(--letter-box-shadow-end);\n            }\n\n            .active {\n                border: solid 2px var(--letter-border-color-active);\n                background-color: var(--letter-background-color-active);\n            }\n\n            .trash {\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                height: 50px;\n                width: 50px;\n                font-size: 30px;\n                cursor: pointer;\n                user-select: none;\n            }\n        ");
    shadowRoot.append(style);
    var startWord = state.words[0];
    var endWord = state.words[5];
    var words = state.flipped ? _toConsumableArray(state.words).reverse() : state.words;
    words.forEach(function (w, y) {
      var actualY = state.flipped ? 5 - y : y;
      var row = document.createElement('div');
      row.className = 'row';
      w.forEach(function (l, x) {
        var cell = document.createElement('div');
        cell.classList.add('cell');
        if (startWord.indexOf(l) !== -1) cell.classList.add('start');
        if (endWord.indexOf(l) !== -1) cell.classList.add('end');
        if (!state.finished && x === state.position.x && actualY === state.position.y && actualY < 5) cell.classList.add('active');
        cell.textContent = l;
        if (l !== ' ') cell.addEventListener('click', function () {
          return _this.letterPress(l);
        });
        row.append(cell);
      });
      if (!state.finished && interactive) {
        if (y === (state.flipped ? 5 - state.position.y : state.position.y)) {
          if (state.position.x > 0) {
            var key = document.createElement('div');
            key.textContent = '⌫';
            key.className = 'key';
            key.addEventListener('click', function () {
              return _this.backspacePress();
            });
            row.append(key);
          }
          if (state.position.x === 5) {
            var _key = document.createElement('div');
            _key.textContent = '⏎';
            _key.className = 'key';
            _key.addEventListener('click', function () {
              return _this.enterPress();
            });
            row.append(_key);
          }
        } else if (!state.flipped && state.position.y > 1 && y === state.position.y - 1 || state.flipped && state.position.y < 4 && y === 5 - state.position.y - 1) {
          var _key2 = document.createElement('div');
          _key2.textContent = '🗑️';
          _key2.className = 'trash';
          _key2.addEventListener('click', function () {
            return _this.trashPress();
          });
          row.append(_key2);
        }
      }
      shadowRoot.append(row);
    });
    return _this;
  }
  _createClass(GameBoard, [{
    key: "letterPress",
    value: function letterPress(letter) {
      this.dispatchEvent(new CustomEvent('letterPress', {
        detail: {
          letter: letter
        }
      }));
    }
  }, {
    key: "enterPress",
    value: function enterPress() {
      this.dispatchEvent(new CustomEvent('enterPress'));
    }
  }, {
    key: "backspacePress",
    value: function backspacePress() {
      this.dispatchEvent(new CustomEvent('backspacePress'));
    }
  }, {
    key: "trashPress",
    value: function trashPress() {
      this.dispatchEvent(new CustomEvent('trashPress'));
    }
  }]);
  return GameBoard;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.GameBoard = GameBoard;
customElements.define('game-board', GameBoard);
},{}],"utils.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.putHistory = exports.numStars = exports.loadFile = exports.level = exports.key = exports.isFinished = exports.isEmpty = exports.getHistory = void 0;
var numStars = function numStars(s) {
  return Math.max(0, 5 - Math.floor(s / 60));
};
exports.numStars = numStars;
var loadFile = function loadFile(file) {
  return fetch(file).then(function (response) {
    return response.text();
  }).then(function (text) {
    return text.split('\n');
  });
};
exports.loadFile = loadFile;
var key = function key() {
  var d = new Date(); // local time

  return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, '0'), "-").concat(String(d.getDate()).padStart(2, '0'));
};
exports.key = key;
var level = function level() {
  return Date.parse(key()) / 86400000 % 5;
};
exports.level = level;
var getHistory = function getHistory() {
  var _JSON$parse;
  return (_JSON$parse = JSON.parse(localStorage.getItem('history'))) !== null && _JSON$parse !== void 0 ? _JSON$parse : {};
};
exports.getHistory = getHistory;
var putHistory = function putHistory(history) {
  return localStorage.setItem('history', JSON.stringify(history));
};
exports.putHistory = putHistory;
var isEmpty = function isEmpty(obj) {
  return Object.keys(obj).length === 0;
};
exports.isEmpty = isEmpty;
var isFinished = function isFinished(words) {
  return words.every(function (w) {
    return w.every(function (l) {
      return l !== ' ';
    });
  });
};
exports.isFinished = isFinished;
},{}],"game-stars.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GameStars = void 0;
var _utils = require("./utils.mjs");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var GameStars = /*#__PURE__*/function (_HTMLElement) {
  _inherits(GameStars, _HTMLElement);
  var _super = _createSuper(GameStars);
  function GameStars(seconds) {
    var _this;
    _classCallCheck(this, GameStars);
    _this = _super.call(this);
    var n = (0, _utils.numStars)(seconds);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    var style = document.createElement('style');
    style.textContent = "\n            :host {\n                display: flex;\n                gap: 10px;\n                font-size: 40px;\n            }\n        ";
    shadowRoot.append(style);
    for (var i = 0; i < n; i++) {
      var star = document.createElement('div');
      star.textContent = '⭐';
      if (i === n - 1) {
        star.style.opacity = 1 - seconds % 60 / 60;
      }
      shadowRoot.append(star);
    }
    return _this;
  }
  return _createClass(GameStars);
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.GameStars = GameStars;
customElements.define('game-stars', GameStars);
},{"./utils.mjs":"utils.mjs"}],"popup-message.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PopupMessage = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var PopupMessage = /*#__PURE__*/function (_HTMLElement) {
  _inherits(PopupMessage, _HTMLElement);
  var _super = _createSuper(PopupMessage);
  function PopupMessage(type) {
    var _this;
    _classCallCheck(this, PopupMessage);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    shadowRoot.append(template.content.cloneNode(true));
    shadowRoot.addEventListener('click', function (e) {
      return _this.handleClick(e);
    });
    return _this;
  }
  _createClass(PopupMessage, [{
    key: "handleClick",
    value: function handleClick(event) {
      if (event.target.nodeName === 'BUTTON') {
        this.dispatchEvent(new CustomEvent('buttonClick', {
          detail: {
            name: event.target.textContent
          }
        }));
      }
    }
  }]);
  return PopupMessage;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.PopupMessage = PopupMessage;
customElements.define('popup-message', PopupMessage);
var template = document.createElement('template');
template.innerHTML = "\n    <style>\n        :host {\n            position: fixed;\n            top: var(--popup-top);\n            left: 50%;\n            transform: translate(-50%, 0);\n            width: 300px;\n            font-size: 20px;\n            border: solid 1px var(--popup-border-color);\n            border-radius: var(--popup-border-radius);\n            background-color: var(--popup-background-color);\n            text-align: center;\n            box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.25);\n        }\n\n        div {\n            padding: 10px;\n            color: var(--popup-color);\n        }\n\n        .error {\n            color: red;\n        }\n\n        .success {\n            color: green;\n        }\n        </style>\n    <div class=\"popup\">\n        <slot name=\"content\"></slot>\n    </div>\n";
},{}],"popup-help.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PopupHelp = void 0;
var _gameBoard = require("./game-board.mjs");
var _gameStars = require("./game-stars.mjs");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var state = {
  words: ['chart'.split(''), '     '.split(''), '     '.split(''), '     '.split(''), '     '.split(''), 'spiel'.split('')],
  position: {
    x: 0,
    y: 1
  }
};
var PopupHelp = /*#__PURE__*/function (_HTMLElement) {
  _inherits(PopupHelp, _HTMLElement);
  var _super = _createSuper(PopupHelp);
  function PopupHelp(type) {
    var _this;
    _classCallCheck(this, PopupHelp);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    shadowRoot.append(template.content.cloneNode(true));
    shadowRoot.addEventListener('click', function (e) {
      return _this.handleClick(e);
    });
    var game0 = shadowRoot.getElementById('game-0');
    game0.append(new _gameBoard.GameBoard({
      words: ['chart'.split(''), '     '.split(''), '     '.split(''), '     '.split(''), '     '.split(''), 'spiel'.split('')],
      position: {
        x: 0,
        y: 1
      }
    }, false));
    var game1 = shadowRoot.getElementById('game-1');
    game1.append(new _gameBoard.GameBoard(_objectSpread(_objectSpread({}, state), {}, {
      words: ['chart'.split(''), 'trash'.split(''), '     '.split(''), '     '.split(''), '     '.split(''), 'spiel'.split('')],
      position: {
        x: 0,
        y: 2
      }
    }), false));
    var game2 = shadowRoot.getElementById('game-2');
    game2.append(new _gameBoard.GameBoard(_objectSpread(_objectSpread({}, state), {}, {
      words: ['chart'.split(''), 'trash'.split(''), 'stare'.split(''), '     '.split(''), '     '.split(''), 'spiel'.split('')],
      position: {
        x: 0,
        y: 3
      }
    }), false));
    var game3 = shadowRoot.getElementById('game-3');
    game3.append(new _gameBoard.GameBoard(_objectSpread(_objectSpread({}, state), {}, {
      words: ['chart'.split(''), 'trash'.split(''), 'stare'.split(''), '     '.split(''), '     '.split(''), 'spiel'.split('')],
      position: {
        x: 0,
        y: 4
      },
      flipped: true
    }), false));
    var game4 = shadowRoot.getElementById('game-4');
    game4.append(new _gameBoard.GameBoard(_objectSpread(_objectSpread({}, state), {}, {
      words: ['chart'.split(''), 'trash'.split(''), 'stare'.split(''), '     '.split(''), 'lapse'.split(''), 'spiel'.split('')],
      position: {
        x: 0,
        y: 3
      },
      flipped: true
    }), false));
    var game5 = shadowRoot.getElementById('game-5');
    game5.append(new _gameBoard.GameBoard(_objectSpread(_objectSpread({}, state), {}, {
      words: ['chart'.split(''), 'trash'.split(''), 'stare'.split(''), 'spear'.split(''), 'lapse'.split(''), 'spiel'.split('')],
      finished: true,
      position: {
        x: 0,
        y: 3
      },
      flipped: true
    }), false));
    var stars = shadowRoot.getElementById('stars');
    stars.append(new _gameStars.GameStars(0));
    return _this;
  }
  _createClass(PopupHelp, [{
    key: "handleClick",
    value: function handleClick(event) {
      if (event.target.nodeName === 'BUTTON') {
        this.dispatchEvent(new CustomEvent('buttonClick', {
          detail: {
            name: event.target.textContent
          }
        }));
      }
    }
  }]);
  return PopupHelp;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.PopupHelp = PopupHelp;
customElements.define('popup-help', PopupHelp);
var template = document.createElement('template');
template.innerHTML = "\n    <style>\n        :host {\n            position: fixed;\n            top: var(--popup-top);\n            left: 50%;\n            transform: translate(-50%, 0);\n            width: 350px;\n            font-size: 20px;\n            border: solid 1px var(--popup-border-color);\n            border-radius: var(--popup-border-radius);\n            background-color: var(--popup-background-color);\n            box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.25);\n        }\n\n        h1 {\n            text-align: center;\n            margin: 0;\n            font-size: 30px;\n        }\n\n        div {\n            padding: 10px;\n            color: var(--popup-color);\n        }\n\n        .scroll {\n            border: solid 1px var(--popup-border-color);\n            border-radius: var(--popup-border-radius);\n            height: 400px;\n            overflow-y: scroll;\n        }\n\n        .center { text-align: center; }\n\n        .footer {\n            font-size: 30px;\n            text-align: center;\n        }\n\n        button {\n            font-size: 20px;\n        }\n\n        #stars {\n            margin-left: 20px;\n        }\n\n        a {\n        color: var(--link-color);\n        }\n    </style>\n    <div>\n        <h1>ANAGRAMISH</h1>\n        <p class=\"center\">by <a target=\"_blank\" href=\"http://twitter.com/emh\">emh</a></p>\n\n        <div class=\"scroll\">\n            <h1>How to Play</h1>\n            <p>The game board has a start word and an end word.</p>\n            <div id=\"game-0\"></div>\n            <p>Your goal is to find words that use 4 letters from the word above and 1 letter from the word at the bottom. In any order - like an anagram!</p>\n            <div id=\"game-1\"></div>\n            <p>Repeat this until you've filled in all 4 words.</p>\n            <div id=\"game-2\"></div>\n            <p>If you're stuck on a word you can try working the puzzle in the other direction by clicking the Flip button.</p>\n            <div id=\"game-3\"></div>\n            <p>Now, same as before, find a word that uses 4 letters from the word above and 1 letter from the word at the bottom.</p>\n            <div id=\"game-4\"></div>\n            <p>You win the game when you fill in the last word.</p>\n            <div id=\"game-5\"></div>\n            <p>Your score is the number of stars still showing -- you lose a star for every minute you're working on the puzzle.</p>\n            <div id=\"stars\"></div>\n            <p>Ready?</p>\n        </div>\n        <div class=\"footer\">\n            <button>Game on!</button>\n        </div>\n    </div>\n";
},{"./game-board.mjs":"game-board.mjs","./game-stars.mjs":"game-stars.mjs"}],"summary-chart.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SummaryChart = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var SummaryChart = /*#__PURE__*/function (_HTMLElement) {
  _inherits(SummaryChart, _HTMLElement);
  var _super = _createSuper(SummaryChart);
  function SummaryChart(stats) {
    var _this;
    _classCallCheck(this, SummaryChart);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    var style = document.createElement('style');
    style.textContent = "\n            :host {\n                display: flex;\n                align-items: center;\n                flex-direction: column;\n            }\n\n            #chart > div {\n                display: flex;\n            }\n\n            #chart > div > div {\n                width: 25px;\n                height: 25px;\n                font-size: 10px;\n            }\n        ";
    shadowRoot.append(style);
    var div = document.createElement('div');
    div.id = "chart";
    div.innerHTML = "\n            <div>\n                <div>\u2B1B</div><div>\u2B1B</div><div>\u2B1B</div><div>\u2B1B</div><div>\uD83D\uDFE8</div>\n                <div>".concat(stats[0][0], "</div><div>").concat(stats[0][1], "</div><div>").concat(stats[0][2], "</div><div>").concat(stats[0][3], "</div><div>").concat(stats[0][4], "</div><div>").concat(stats[0][5], "</div>\n            </div>\n\n            <div>\n                <div>\u2B1B</div><div>\u2B1B</div><div>\u2B1B</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div>\n                <div>").concat(stats[1][0], "</div><div>").concat(stats[1][1], "</div><div>").concat(stats[1][2], "</div><div>").concat(stats[1][3], "</div><div>").concat(stats[1][4], "</div><div>").concat(stats[1][5], "</div>\n            </div>\n\n            <div>\n                <div>\u2B1B</div><div>\u2B1B</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div>\n                <div>").concat(stats[2][0], "</div><div>").concat(stats[2][1], "</div><div>").concat(stats[2][2], "</div><div>").concat(stats[2][3], "</div><div>").concat(stats[2][4], "</div><div>").concat(stats[2][5], "</div>\n            </div>\n\n            <div>\n                <div>\u2B1B</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div>\n                <div>").concat(stats[3][0], "</div><div>").concat(stats[3][1], "</div><div>").concat(stats[3][2], "</div><div>").concat(stats[3][3], "</div><div>").concat(stats[3][4], "</div><div>").concat(stats[3][5], "</div>\n            </div>\n\n            <div>\n                <div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div><div>\uD83D\uDFE8</div>\n                <div>").concat(stats[4][0], "</div><div>").concat(stats[4][1], "</div><div>").concat(stats[4][2], "</div><div>").concat(stats[4][3], "</div><div>").concat(stats[4][4], "</div><div>").concat(stats[4][5], "</div>\n            </div>\n\n            <div>\n                <div></div><div></div><div></div><div></div><div></div>\n                <div></div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div>\n            </div>\n\n            <div>\n                <div></div><div></div><div></div><div></div><div></div>\n                <div></div><div></div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div>\n            </div>\n\n            <div>\n                <div></div><div></div><div></div><div></div><div></div>\n                <div></div><div></div><div></div><div>\u2B50</div><div>\u2B50</div><div>\u2B50</div>\n            </div>\n\n            <div>\n                <div></div><div></div><div></div><div></div><div></div>\n                <div></div><div></div><div></div><div></div><div>\u2B50</div><div>\u2B50</div>\n            </div>\n\n            <div>\n                <div></div><div></div><div></div><div></div><div></div>\n                <div></div><div></div><div></div><div></div><div></div><div>\u2B50</div>\n            </div>\n        ");
    shadowRoot.append(div);
    return _this;
  }
  return _createClass(SummaryChart);
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.SummaryChart = SummaryChart;
customElements.define('summary-chart', SummaryChart);
},{}],"history-chart.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HistoryChart = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var HistoryChart = /*#__PURE__*/function (_HTMLElement) {
  _inherits(HistoryChart, _HTMLElement);
  var _super = _createSuper(HistoryChart);
  function HistoryChart(stats) {
    var _this;
    _classCallCheck(this, HistoryChart);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    var style = document.createElement('style');
    style.textContent = "\n            :host {\n                text-align: left;\n                font-size: 12px;\n            }\n        ";
    shadowRoot.append(style);
    var div = document.createElement('div');
    div.id = "chart";
    console.log(stats);
    div.innerHTML = stats.map(function (entry) {
      return "<div>\n                ".concat('⬛'.repeat(4 - entry.level)).concat('🟨'.repeat(entry.level + 1), "\n                ").concat(entry.date, "\n                ").concat('⭐'.repeat(entry.stars), "\n            </div>");
    }).join('');
    shadowRoot.append(div);
    return _this;
  }
  return _createClass(HistoryChart);
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.HistoryChart = HistoryChart;
customElements.define('history-chart', HistoryChart);
},{}],"popup-stats.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PopupStats = void 0;
var _summaryChart = require("./summary-chart.mjs");
var _historyChart = require("./history-chart.mjs");
var _utils = require("./utils.mjs");
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
var levelFromCount = function levelFromCount(count) {
  if (count < 10) return 4;
  if (count < 40) return 3;
  if (count < 160) return 2;
  if (count < 640) return 1;
  return 0;
};
var PopupStats = /*#__PURE__*/function (_HTMLElement) {
  _inherits(PopupStats, _HTMLElement);
  var _super = _createSuper(PopupStats);
  function PopupStats(history) {
    var _this;
    _classCallCheck(this, PopupStats);
    console.log(history);
    _this = _super.call(this);
    var shadowRoot = _this.attachShadow({
      mode: 'open'
    });
    shadowRoot.append(template.content.cloneNode(true));
    shadowRoot.addEventListener('click', function (e) {
      return _this.handleClick(e);
    });
    var summaryStats = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
    var historyStats = [];
    var keys = Object.keys(history);
    keys.sort().forEach(function (k) {
      var game = history[k];
      var level = levelFromCount(game.pair[2]);
      if (k === (0, _utils.key)()) return;
      var stars = game.finished ? (0, _utils.numStars)(game.numSeconds) : 0;
      historyStats.push({
        date: k,
        level: level,
        stars: stars
      });
      summaryStats[level][stars]++;
    });
    console.log(summaryStats, historyStats);
    var summaryDiv = shadowRoot.getElementById('summary');
    summaryDiv.append(new _summaryChart.SummaryChart(summaryStats));
    var historyDiv = shadowRoot.getElementById('history');
    historyDiv.append(new _historyChart.HistoryChart(historyStats));
    return _this;
  }
  _createClass(PopupStats, [{
    key: "handleClick",
    value: function handleClick(event) {
      if (event.target.nodeName === 'BUTTON') {
        this.dispatchEvent(new CustomEvent('buttonClick', {
          detail: {
            name: event.target.textContent
          }
        }));
      }
    }
  }]);
  return PopupStats;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
exports.PopupStats = PopupStats;
customElements.define('popup-stats', PopupStats);
var template = document.createElement('template');
template.innerHTML = "\n    <style>\n        :host {\n            position: fixed;\n            top: var(--popup-top);\n            left: 50%;\n            transform: translate(-50%, 0);\n            width: 400px;\n            font-size: 20px;\n            border: solid 1px var(--popup-border-color);\n            border-radius: var(--popup-border-radius);\n            background-color: var(--popup-background-color);\n            box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.25);\n        }\n\n        h1 {\n            text-align: center;\n            margin: 0;\n            font-size: 30px;\n        }\n\n        div {\n            padding: 10px;\n            color: var(--popup-color);\n        }\n\n        .scroll {\n            border: solid 1px var(--popup-border-color);\n            border-radius: var(--popup-border-radius);\n            height: 400px;\n            overflow-y: scroll;\n            text-align: center;\n        }\n\n        .footer {\n            font-size: 30px;\n            text-align: center;\n        }\n\n        button {\n            font-size: 20px;\n        }\n\n        #history {\n            padding-left: 40px;\n        }\n    </style>\n    <div>\n        <h1>ANAGRAMISH: Stats</h1>\n\n        <div class=\"scroll\">\n            <h1>Summary</h1>\n            <div id=\"summary\"></div>\n            <h1>History</h1>\n            <div id=\"history\"></div>\n        </div>\n        <div class=\"footer\">\n            <button>Game on!</button>\n        </div>\n    </div>\n";
},{"./summary-chart.mjs":"summary-chart.mjs","./history-chart.mjs":"history-chart.mjs","./utils.mjs":"utils.mjs"}],"words.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isLetter = exports.compareWords = void 0;
var sortByCh = function sortByCh(str) {
  return str.toUpperCase().split('').sort();
};
var compare = function compare(ch1, ch2) {
  if (ch1.length === 0 || ch2.length === 0) return 0;
  if (ch1[0] < ch2[0]) return compare(ch1.slice(1), ch2);
  if (ch1[0] > ch2[0]) return compare(ch1, ch2.slice(1));
  return 1 + compare(ch1.slice(1), ch2.slice(1));
};
var compareWords = function compareWords(w1, w2) {
  return compare(sortByCh(w1), sortByCh(w2));
};
exports.compareWords = compareWords;
var isLetter = function isLetter(s) {
  return s.length === 1 && (s >= 'a' && s <= 'z' || s >= 'A' && s <= 'Z');
};
exports.isLetter = isLetter;
},{}],"pairs.txt":[function(require,module,exports) {
module.exports = "/pairs.75f4d694.txt";
},{}],"dictionary.txt":[function(require,module,exports) {
module.exports = "/dictionary.52e469ba.txt";
},{}],"main.js":[function(require,module,exports) {
'use strict';

var _theme = require("./theme.js");
var _virtualKeyboard = require("./virtual-keyboard.mjs");
var _gameBoard = require("./game-board.mjs");
var _gameStars = require("./game-stars.mjs");
var _popupMessage = require("./popup-message.mjs");
var _popupHelp = require("./popup-help.mjs");
var _popupStats = require("./popup-stats.mjs");
var _words = require("./words.mjs");
var _utils = require("./utils.mjs");
var _pairs = _interopRequireDefault(require("./pairs.txt"));
var _dictionary = _interopRequireDefault(require("./dictionary.txt"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, catch: function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function goal(name) {
  try {
    clicky.goal(name);
  } catch (e) {
    console.error('Error logging goal', name, e);
  }
}
function loadGame() {
  var history = (0, _utils.getHistory)();
  return history[(0, _utils.key)()];
}
function saveGame(game) {
  var history = (0, _utils.getHistory)();
  history[(0, _utils.key)()] = game;
  (0, _utils.putHistory)(history);
}
function parse(pairs) {
  return pairs.map(function (pair) {
    var pieces = pair.split(',');
    return [pieces[0], pieces[1], Number(pieces[2])];
  });
}
var countForLevel = function countForLevel(level) {
  return level === 0 ? 10000 : Math.pow(2, 10 - (1 + level) * 2) * 10;
};
var checkCount = function checkCount(pair, minCount, maxCount) {
  var count = pair[2];
  return count >= minCount && count < maxCount;
};
var calcIndex = function calcIndex(n) {
  var d = Date.parse((0, _utils.key)());
  var f = Math.PI - 3; // need a number > 0 and < 1
  var s = d.valueOf() / 1000;
  var r = s * f - Math.floor(s * f);
  var i = Math.floor(n * r);
  return i;
};
function choosePair(pairs, level) {
  var maxCount = countForLevel(level);
  var minCount = level === 4 ? 1 : countForLevel(level + 1);
  var filteredPairs = pairs.filter(function (pair) {
    return checkCount(pair, minCount, maxCount);
  });
  var n = filteredPairs.length;
  var i = calcIndex(n);
  return filteredPairs[i];
}
function renderBoard(state) {
  var container = document.getElementById('board');
  var gameBoard = new _gameBoard.GameBoard(state);
  container.innerHTML = '';
  container.append(gameBoard);
  setupBoardHandler(state);
}
function renderKeyboard(state) {
  var container = document.getElementById('keyboard');
  var validLetters = [].concat(_toConsumableArray(state.words[0]), _toConsumableArray(state.words[5]));
  var control = function control(value) {
    return {
      value: value,
      control: true
    };
  };
  var letter = function letter(value) {
    return {
      value: value,
      disabled: !validLetters.includes(value)
    };
  };
  var keys = [[control('Flip ⇵')], [], ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(letter), ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(letter), [control('⏎')].concat(_toConsumableArray(['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(letter)), [control('⌫')])];
  var keyboard = new _virtualKeyboard.VirtualKeyboard(keys);
  container.innerHTML = '';
  container.append(keyboard);
}
function initWords(pair) {
  var words = [pair[0], '     ', '     ', '     ', '     ', pair[1]].map(function (w) {
    return w.split('');
  });
  return words;
}
function calculateStats(history) {
  var streak = 0;
  var keys = Object.keys(history);
  var pk = null;
  keys.sort().forEach(function (k) {
    var game = history[k];
    console.log(game, k !== (0, _utils.key)(), pk && new Date(k) - new Date(pk) > 86400000);
    if (!game.finished && k !== (0, _utils.key)() || pk && new Date(k) - new Date(pk) > 86400000) {
      console.log('reset streak a');
      streak = 0;
    }
    if (game.finished) {
      console.log('increment streak');
      streak++;
    }
    pk = k;
  });
  console.log(pk, (0, _utils.key)());
  if (pk && new Date((0, _utils.key)()) - new Date(pk) > 86400000) {
    console.log('reset streak b');
    streak = 0;
  }
  return {
    level: (0, _utils.level)(),
    streak: streak
  };
}
function initTodaysGame(pairs, level) {
  var pair = choosePair(pairs, level);
  return {
    pair: pair,
    numSeconds: 0,
    flips: 0,
    trashes: 0,
    guesses: 0
  };
}
function init(pairs, dict) {
  var history = (0, _utils.getHistory)();
  var _calculateStats = calculateStats(history),
    level = _calculateStats.level,
    streak = _calculateStats.streak;
  var game = loadGame();
  if (!game) {
    game = initTodaysGame(pairs, level);
    saveGame(game);
  }
  return {
    started: false,
    dict: dict,
    level: level,
    streak: streak,
    finished: game.finished,
    words: game.finished ? game.words : initWords(game.pair),
    position: {
      x: 0,
      y: 1
    },
    newUser: (0, _utils.isEmpty)(history)
  };
}
function handleBackspace(state) {
  if (state.position.x > 0) {
    state.position.x -= 1;
    state.words[state.position.y][state.position.x] = ' ';
  }
}
function handleLetterInput(state, letter) {
  if (state.position.x < 5 && state.position.y > 0 && state.position.y < 5) {
    state.words[state.position.y][state.position.x] = letter;
    state.position.x = state.position.x + 1;
  }
}
var emojiletters = {
  a: '🇦',
  b: '🇧',
  c: '🇨',
  d: '🇩',
  e: '🇪',
  f: '🇫',
  g: '🇬',
  h: '🇭',
  i: '🇮',
  j: '🇯',
  k: '🇰',
  l: '🇱',
  m: '🇲',
  n: '🇳',
  o: '🇴',
  p: '🇵',
  q: '🇶',
  r: '🇷',
  s: '🇸',
  t: '🇹',
  u: '🇺',
  v: '🇻',
  w: '🇼',
  x: '🇽',
  y: '🇾',
  z: '🇿',
  black: '⬛',
  yellow: '🟨',
  star: '⭐',
  timer: '⏲️',
  flip: '↕️',
  trash: '🗑️',
  guess: '🔠'
};
function emojiWord(word) {
  return word.map(function (letter) {
    return emojiletters[letter];
  }).join(' ');
}
function emojiLevel(level) {
  var word = [];
  for (var i = 0; i < 5; i++) {
    word.push(i <= level ? emojiletters.yellow : emojiletters.black);
  }
  return word.join(' ');
}
var time = function time(s) {
  return "".concat(String(Math.floor(s / 60)).padStart(2, '0'), ":").concat(String(s % 60).padStart(2, '0'));
};
function emojiStats(_ref, _ref2) {
  var _ref$guesses = _ref.guesses,
    guesses = _ref$guesses === void 0 ? 0 : _ref$guesses,
    _ref$numSeconds = _ref.numSeconds,
    numSeconds = _ref$numSeconds === void 0 ? 0 : _ref$numSeconds,
    _ref$flips = _ref.flips,
    flips = _ref$flips === void 0 ? 0 : _ref$flips,
    _ref$trashes = _ref.trashes,
    trashes = _ref$trashes === void 0 ? 0 : _ref$trashes;
  var streak = _ref2.streak;
  return ["\u23F2\uFE0F ".concat(time(numSeconds), " \uD83C\uDFC3 ").concat(streak), "\uD83D\uDD20 ".concat(guesses, " \u2195\uFE0F ").concat(flips, " \uD83D\uDDD1\uFE0F ").concat(trashes)];
}
function showSuccess(state) {
  var game = loadGame();
  var n = (0, _utils.numStars)(game.numSeconds);
  var message = "\n        <p>You solved it!</p>\n        <p>You earned ".concat(n, " star").concat(n !== 1 ? 's' : '', "<br/>\n        ").concat(state.streak === 1 ? 'and you started a new streak' : "and your streak is ".concat(state.streak), ".</p>\n        <div>\n        ").concat(emojiWord(state.words[0]), "<br/>\n        ").concat(emojiLevel(state.level), "<br/>\n        ").concat(emojiStats(game, state).join('<br>'), "<br/>\n        ").concat(emojiWord(state.words[5]), "\n        </div>\n        <p>Have you played <br/><a href=\"https://emh.io/cards/ps\">Poker Squares</a>?</p>\n        <p id=\"copied\">Copied to clipboard.</p>\n        <div class=\"buttons\">\n        <button>Share</button>\n        <button>Copy</button>\n        <button>OK</button>\n        </div>\n    ");
  var app = document.getElementById('app');
  var popup = new _popupMessage.PopupMessage('success');
  var div = document.createElement('div');
  div.setAttribute('id', 'popup');
  div.setAttribute('slot', 'content');
  div.innerHTML = message;
  popup.addEventListener('buttonClick', function (e) {
    var name = e.detail.name;
    if (name === 'Share' || name === 'Copy') {
      goal('Shared');
      var share = ['Anagramish by @emh', emojiWord(state.words[0]), emojiLevel(state.level), emojiStats(game, state).join('\n'), emojiWord(state.words[5]), '', 'https://anagramish.com'];
      var data = {
        title: 'Anagramish',
        text: share.join('\n')
      };
      if (name === 'Share' && navigator.canShare && navigator.canShare(data)) {
        navigator.share(data);
      } else {
        var _div = document.querySelector('#copied');
        _div.style.visibility = "visible";
        navigator.clipboard.writeText(data.text);
      }
    } else if (name === '*') {
      navigator.clipboard.writeText(localStorage.getItem('history'));
    } else {
      app.removeChild(popup);
    }
  });
  popup.append(div);
  app.appendChild(popup);
}
function handleEnter(state) {
  if (state.position.x === 5 && state.position.y < 5) {
    var game = loadGame();
    game.guesses += 1;
    saveGame(game);
    var y = state.position.y;
    var word = state.words[y].join('');
    var previousWord = state.words[state.flipped ? y + 1 : y - 1].join('');
    var nextWord = state.words[state.flipped ? y - 1 : y + 1].join('');
    var firstWord = state.words[state.flipped ? 5 : 0].join('');
    var lastWord = state.words[state.flipped ? 0 : 5].join('');
    var hasNextWord = nextWord !== '     ';
    var classesFor = function classesFor(l) {
      var classes = ['letter'];
      if (state.words[0].indexOf(l) !== -1) classes.push('start');
      if (state.words[5].indexOf(l) !== -1) classes.push('end');
      return classes.join(' ');
    };
    var renderWord = function renderWord(word) {
      var letters = word.split('');
      return "<div class=\"word\">".concat(letters.map(function (l) {
        return "<span class=\"".concat(classesFor(l), "\">").concat(l, "</span>");
      }).join(''), "</div>");
    };
    if (!state.dict.includes(word)) {
      showError('Not a word.', y);
    } else if ((0, _words.compareWords)(word, previousWord) !== 4) {
      showError("".concat(renderWord(word), "<p>can only be one letter different from</p>").concat(renderWord(previousWord)));
    } else if (hasNextWord && (0, _words.compareWords)(word, nextWord) !== 4) {
      showError("".concat(renderWord(word), "<p>can only be one letter different from</p>").concat(renderWord(nextWord)));
    } else if ((0, _words.compareWords)(word, firstWord) !== (state.flipped ? y : 5 - y) || (0, _words.compareWords)(word, lastWord) !== (state.flipped ? 5 - y : y)) {
      showError("<p>You have to use ".concat(5 - y, " letter").concat(y === 4 ? '' : 's', " from</p>").concat(renderWord(state.words[0].join('')), "<p>and ").concat(y, " letter").concat(y === 1 ? '' : 's', " from</p>").concat(renderWord(state.words[5].join(''))));
    } else {
      goal('Entered Word');
      state.position.y += state.flipped ? -1 : 1;
      state.position.x = 0;
      if ((0, _utils.isFinished)(state.words)) {
        goal('Game Finished');
        if (state.timer) {
          clearInterval(state.timer);
        }
        var _game = loadGame();
        state.streak++;
        state.finished = true;
        _game.finished = true;
        _game.words = state.words;
        saveGame(_game);
        showSuccess(state);
      }
    }
  }
}
function handleDeleteWord(state) {
  var game = loadGame();
  game.trashes += 1;
  saveGame(game);
  state.words[state.position.y] = '     '.split('');
  state.position.y -= state.flipped ? -1 : 1;
  state.words[state.position.y] = '     '.split('');
}
var emptyWord = function emptyWord(word) {
  return word.join('') === '     ';
};
function handleFlip(state) {
  var game = loadGame();
  game.flips += 1;
  saveGame(game);
  state.flipped = !state.flipped;
  state.words[state.position.y] = '     '.split('');
  state.position.x = 0;
  state.position.y = state.flipped ? state.words.findLastIndex(emptyWord) : state.words.findIndex(emptyWord);
}
function clearPopup() {
  var app = document.getElementById('app');
  var popup = app.querySelector('popup-message');
  if (popup) {
    app.removeChild(popup);
    return true;
  }
  return false;
}
function setupKeyboardHandler(state) {
  var keyboard = document.querySelector('virtual-keyboard');
  keyboard.addEventListener('keypress', function (event) {
    var key = event.detail.key;
    if (state.position.y < 5) {
      if (key === '⌫') {
        handleBackspace(state);
      } else if (key === '⏎') {
        handleEnter(state);
      } else if (key.length === 1) {
        handleLetterInput(state, key);
      } else if (key.startsWith('Flip')) {
        handleFlip(state);
      }
      renderBoard(state);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!state.finished) {
      if (clearPopup()) return;
      switch (e.key) {
        case 'Backspace':
          handleBackspace(state);
          break;
        case 'Enter':
          handleEnter(state);
          break;
        default:
          if ((0, _words.isLetter)(e.key)) {
            var letter = e.key.toLowerCase();
            if (state.words[0].includes(letter) || state.words[5].includes(letter)) {
              handleLetterInput(state, letter);
            }
          } else {
            console.log(e.key);
          }
      }
      renderBoard(state);
    }
  });
}
function setupBoardHandler(state) {
  var div = document.querySelector('game-board');
  div.addEventListener('letterPress', function (event) {
    if (!state.started || state.finshed) return;
    var letter = event.detail.letter;
    handleLetterInput(state, letter);
    renderBoard(state);
  });
  div.addEventListener('enterPress', function () {
    handleEnter(state);
    renderBoard(state);
  });
  div.addEventListener('backspacePress', function () {
    handleBackspace(state);
    renderBoard(state);
  });
  div.addEventListener('trashPress', function () {
    handleDeleteWord(state);
    renderBoard(state);
  });
}
function showError(message) {
  var app = document.getElementById('app');
  var error = new _popupMessage.PopupMessage('error');
  var content = document.createElement('div');
  content.setAttribute('slot', 'content');
  content.innerHTML = "".concat(message, "<br/><br/><div class=\"buttons\"><button>OK</button>");
  error.append(content);
  app.append(error);
  error.addEventListener('buttonClick', function (e) {
    app.removeChild(error);
  });
}
function showHelp() {
  var app = document.getElementById('app');
  var popup = new _popupHelp.PopupHelp();
  popup.addEventListener('buttonClick', function (event) {
    app.removeChild(popup);
  });
  app.appendChild(popup);
}
function showStats() {
  var app = document.getElementById('app');
  var popup = new _popupStats.PopupStats((0, _utils.getHistory)());
  popup.addEventListener('buttonClick', function (event) {
    app.removeChild(popup);
  });
  app.appendChild(popup);
}
function showPopup(state) {
  return new Promise(function (resolve) {
    var app = document.getElementById('app');
    var popup = new _popupMessage.PopupMessage();
    var div = document.createElement('div');
    div.setAttribute('slot', 'content');
    var message = '';
    if (state.newUser) {
      message = "\n                <p>Welcome to ANAGRAMISH.</p><p>Find the four words that connect the first word to the last.</p><p>Each word in between must use four letters from the word above it and 1 letter from the bottom word.</p>\n            ";
    } else {
      message = "\n                <p>Welcome back.</p>\n                ".concat(state.streak > 0 ? "<p>Your streak is currently ".concat(state.streak, ".</p>") : '<p>Starting a new streak today - come back daily to keep it going.', "\n            ");
    }
    div.innerHTML = "\n            ".concat(message, "\n            <p>Good luck!</p>\n            <div class=\"buttons\">\n                <button>Help</button>\n                <button>Start</button>\n            </div>\n        ");
    popup.append(div);
    popup.addEventListener('buttonClick', function (event) {
      var name = event.detail.name;
      if (name === 'Start') {
        app.removeChild(popup);
        state.started = true;
        resolve();
      } else {
        showHelp();
      }
    });
    app.appendChild(popup);
  });
}
function renderStars(seconds) {
  var div = document.getElementById('stars');
  var stars = new _gameStars.GameStars(seconds);
  div.innerHTML = '';
  div.append(stars);
}
function startClock(state) {
  var fn = function fn() {
    var game = loadGame();
    game.numSeconds += 1;
    saveGame(game);
    renderStars(game.numSeconds);
  };
  fn();
  state.timer = setInterval(fn, 1000);
}
function render(state) {
  renderBoard(state);
  renderKeyboard(state);
}
function fixHistoryDates() {
  var history = (0, _utils.getHistory)();
  var keys = Object.keys(history);
  console.log(keys);
  keys.forEach(function (key) {
    var match = key.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      var newKey = "".concat(match[3], "-").concat(match[1].padStart(2, '0'), "-").concat(match[2].padStart(2, '0'));
      history[newKey] = history[key];
      delete history[key];
    }
  });
  (0, _utils.putHistory)(history);
}
function main() {
  return _main.apply(this, arguments);
}
function _main() {
  _main = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var pairs, dict, state, themeManager, help, stats;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          fixHistoryDates();
          _context.next = 3;
          return (0, _utils.loadFile)(_pairs.default);
        case 3:
          pairs = _context.sent;
          _context.next = 6;
          return (0, _utils.loadFile)(_dictionary.default);
        case 6:
          dict = _context.sent;
          state = init(parse(pairs), dict);
          themeManager = new _theme.ThemeManager();
          window.themeManager = themeManager;
          render(state);
          help = document.getElementById('help');
          help.addEventListener('click', function (e) {
            e.preventDefault();
            showHelp();
          });
          stats = document.getElementById('stats');
          stats.addEventListener('click', function (e) {
            e.preventDefault();
            showStats();
          });
          if (state.finished) {
            showSuccess(state);
          } else {
            showPopup(state).then(function () {
              setupKeyboardHandler(state);
              startClock(state);
            });
          }
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _main.apply(this, arguments);
}
main();
},{"./theme.js":"theme.js","./virtual-keyboard.mjs":"virtual-keyboard.mjs","./game-board.mjs":"game-board.mjs","./game-stars.mjs":"game-stars.mjs","./popup-message.mjs":"popup-message.mjs","./popup-help.mjs":"popup-help.mjs","./popup-stats.mjs":"popup-stats.mjs","./words.mjs":"words.mjs","./utils.mjs":"utils.mjs","./pairs.txt":"pairs.txt","./dictionary.txt":"dictionary.txt"}],"../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}
module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "49203" + '/');
  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);
    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);
          if (didAccept) {
            handled = true;
          }
        }
      });

      // Enable HMR for CSS by default.
      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });
      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }
    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }
    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }
    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}
function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}
function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}
function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }
  var parents = [];
  var k, d, dep;
  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }
  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }
  return parents;
}
function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}
function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }
  if (checkedAssets[id]) {
    return;
  }
  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }
  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}
function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }
  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }
  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }
}
},{}]},{},["../node_modules/parcel-bundler/src/builtins/hmr-runtime.js","main.js"], null)
//# sourceMappingURL=/main.1f19ae8e.js.map