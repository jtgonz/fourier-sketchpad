"use strict";

let canvas;
let sketch;
let w = 101; let h = 61;
let size = 10;  // size of grid square in pixels (including top and left lines)

class Sketch {
  constructor (canvas, width, height, box_size) {

    if (size % 2) throw "only even numbers!";

    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.w = width; this.h = height;
    this.size = box_size;
  }

  draw_grid () {
    let canvas = this.canvas;
    let context = this.context;

    // size the canvas. the extra pixel is so we have enough room to draw
    // a line at the very end
    canvas.width = w * size + 1;
    canvas.height = h * size + 1;

    // draw vertical and horizontal lines
    xrange(w + 1).forEach( i => {
      context.moveTo(i * size + 0.5, 0);
      context.lineTo(i * size + 0.5, canvas.height);
    });
    xrange(h + 1).forEach( j => {
      context.moveTo(0, j * size + 0.5);
      context.lineTo(canvas.width, j * size + 0.5);
    });
    context.strokeStyle = '#E6E6E6';
    context.stroke();
  }

  /* Change the color of a grid square */
  color_box (x, y, color) {
    this.context.fillStyle = color;
    this.context.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
  }
}

window.onload = function () {

  // get canvas context, draw grid
  let canvas = document.getElementById('draw-on-me');
  sketch = new Sketch(canvas, w, h, size)
  sketch.draw_grid();

  sketch.color_box(10, 10, '#444');
  sketch.color_box(10, 12, '#444');
  sketch.color_box(11, 10, '#444');

  // start listening for mouse events
  // document.addEventListener('mousedown', e => start_draw(e, canvas, size));
}

/* Generator function similar to Python xrange -- this is THE BEST, JERRY */
function xrange(n) {
  let a = {};
  a[Symbol.iterator] = function* (fn) {
    let i = 0;
    while (i < n)
      yield fn ? fn(i++) : i++;
  };
  a.map = fn => [...a[Symbol.iterator](fn)];
  a.forEach = fn => {for (let i of a) fn(i)};
  return a;
}