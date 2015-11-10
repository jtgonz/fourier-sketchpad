"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var canvas = undefined;
var sketch = undefined;
var w = 101;var h = 61;
var size = 10; // size of grid square in pixels (including top and left lines)

var Sketch = (function () {
  function Sketch(canvas, width, height, box_size) {
    _classCallCheck(this, Sketch);

    if (size % 2) throw "only even numbers!";

    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.w = width;this.h = height;
    this.size = box_size;
  }

  _createClass(Sketch, [{
    key: "draw_grid",
    value: function draw_grid() {
      var canvas = this.canvas;
      var context = this.context;

      // size the canvas. the extra pixel is so we have enough room to draw
      // a line at the very end
      canvas.width = w * size + 1;
      canvas.height = h * size + 1;

      // draw vertical and horizontal lines
      xrange(w + 1).forEach(function (i) {
        context.moveTo(i * size + 0.5, 0);
        context.lineTo(i * size + 0.5, canvas.height);
      });
      xrange(h + 1).forEach(function (j) {
        context.moveTo(0, j * size + 0.5);
        context.lineTo(canvas.width, j * size + 0.5);
      });
      context.strokeStyle = '#E6E6E6';
      context.stroke();
    }

    /* Change the color of a grid square */

  }, {
    key: "color_box",
    value: function color_box(x, y, color) {
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
    }
  }]);

  return Sketch;
})();

window.onload = function () {

  // get canvas context, draw grid
  var canvas = document.getElementById('draw-on-me');
  sketch = new Sketch(canvas, w, h, size);
  sketch.draw_grid();

  sketch.color_box(10, 10, '#444');
  sketch.color_box(10, 12, '#444');
  sketch.color_box(11, 10, '#444');

  // start listening for mouse events
  // document.addEventListener('mousedown', e => start_draw(e, canvas, size));
};

/* Generator function similar to Python xrange -- this is THE BEST, JERRY */
function xrange(n) {
  var a = {};
  a[Symbol.iterator] = regeneratorRuntime.mark(function _callee(fn) {
    var i;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          i = 0;

        case 1:
          if (!(i < n)) {
            _context.next = 6;
            break;
          }

          _context.next = 4;
          return fn ? fn(i++) : i++;

        case 4:
          _context.next = 1;
          break;

        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee, this);
  });
  a.map = function (fn) {
    return [].concat(_toConsumableArray(a[Symbol.iterator](fn)));
  };
  a.forEach = function (fn) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = a[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var i = _step.value;
        fn(i);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  };
  return a;
}
