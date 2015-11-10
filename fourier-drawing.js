"use strict";

/*
I feel like eventually we're gonna need to take this whole 'canvas-gridsize'
package and put it into a 'drawinggrid' object. or maybe not, we'll see
*/

let canvas;
let w = 101; let h = 61;
let size = 10;  // size of grid square in pixels (including top and left lines)

// class Grid {
//   constructor (canvas, w, h, s) {
//     this.canvas = canvas;
//     this.context = canvas.getContext('2d');
//     this.w = w; this.h = h; this.s = s;
//   }
// }

window.onload = function () {

  // get canvas context, draw grid
  canvas = document.getElementById('draw-on-me');
  draw_grid(canvas, w, h, size);

  color_box(canvas, 10, 10, size, '#444');
  color_box(canvas, 10, 11, size, '#444');
  color_box(canvas, 11, 10, size, '#444');

  // start listening for mouse events
  // document.addEventListener('mousedown', e => start_draw(e, canvas, size));
}

function draw_grid (canvas, w, h, size) {

  if (size % 2) throw "only even numbers!";

  // size the canvas. the extra pixel is so we have enough room to draw
  // a line at the very end
  canvas.width = w * size + 1;
  canvas.height = h * size + 1;

  let context = canvas.getContext('2d');

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
function color_box (canvas, x, y, size, color) {
  let context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
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