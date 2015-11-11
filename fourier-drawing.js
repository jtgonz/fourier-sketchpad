"use strict";

let canvas;
let sketch;
let w = 121; let h = 71;
let size = 4;  // size of grid square in pixels (including top and left lines)

let lastx, lasty, signal_x, signal_y;

let drawing = false; // set to true when mouse is down and drawing on grid

class Sketch {

  constructor (canvas, width, height, box_size) {

    if (size % 2) throw "only even numbers!";

    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.w = width; this.h = height;
    this.size = box_size;

    // create 2D w x h grid, initialize all elements to zero
    this.grid = (new Array(width)).fill((new Array(height)).fill(0));

    // this.drawing = false; mouse is down and drawing on grid

    // this.canvas.addEventListener('mousedown', this.start_draw);
    // this.canvas.addEventListener('mousemove', this.draw_boxes);
  }

  draw_grid () {
    // size the canvas. the extra pixel is so we have enough room to draw
    // a line at the very end
    this.canvas.width = w * size + 1;
    this.canvas.height = h * size + 1;

    // draw vertical and horizontal lines
    xrange(w + 1).forEach( i => {
      this.context.moveTo(i * size + 0.5, 0);
      this.context.lineTo(i * size + 0.5, this.canvas.height);
    });
    xrange(h + 1).forEach( j => {
      this.context.moveTo(0, j * size + 0.5);
      this.context.lineTo(this.canvas.width, j * size + 0.5);
    });
    this.context.strokeStyle = '#E6E6E6';
    this.context.stroke();
  }

  /* Change the color of a grid square */
  color_box (x, y, color) {
    this.context.fillStyle = color;
    this.context.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
  }

  clear_grid () {
    this.grid.forEach( (a, i) => a.forEach( (_, j) =>
      this.color_box(i, j, '#FFFFFF') ));
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

  sketch.canvas.addEventListener('mousedown', start_draw);
  sketch.canvas.addEventListener('mousemove', draw_boxes);
  sketch.canvas.addEventListener('mouseup', end_draw);
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

function start_draw (e) {
  if (drawing) return false; // this shouldn't happen, but just in case
  sketch.clear_grid();
  drawing = true;

  lastx = null; lasty = null;
  signal_x = []; signal_y = [];

  let x = Math.floor((e.clientX - sketch.canvas.offsetLeft) / sketch.size);
  let y = Math.floor((e.clientY - sketch.canvas.offsetTop) / sketch.size);
  add_to_signal(x, y);
  sketch.color_box(x, y, '#444');
  sketch.grid[x][y] = 2;  // flag as 2 to indicate that this is the start point
  addEventListener(x, y);
}

function draw_boxes (e) {
  if (!drawing) return false;

  let x = Math.floor((e.clientX - sketch.canvas.offsetLeft) / sketch.size);
  let y = Math.floor((e.clientY - sketch.canvas.offsetTop) / sketch.size);
  add_to_signal(x, y);

  //if (sketch.grid[x][y] == 2) {
    // if this was the start point, do something
  //} else {
    sketch.color_box(x, y, '#444');
    sketch.grid[x][y] = 1;
  //}
}

function end_draw (e) {
  if (!drawing) return false; // this shouldn't happen, but just in case
  drawing = false;
}

// if this is a new point, add it to the signal
function add_to_signal (x, y) {
  if (x != lastx || y != lasty) {
    signal_x.push(x);
    signal_y.push(y);
  } 
  lastx = x; lasty = y;
}

