"use strict";

/* okay, let's try this again... */

// user will draw a path (either svg or canvas, who knows). points on that path
// will be given in two arrays. a straight line connects every pair of adjacent
// points. (x_points = [10, 12, 15, ...], y_points = [45, 46, 45, ...])

let xlast, ylast;
let xpts, ypts;

let svg, path_group, path_elem;

let drawing = false; // set to true when mouse is down and drawing on grid

function compute_path_length (pts) {

  return _.range(0, pts.length - 1)
    .map( a => segment_length(pts[a], pts[a+1]) )
    .reduce( (a, b) => a + b);

  // let total_length = 0;
  // for (i = 1; i < pts.length, i++) {
  //   total_length += segment_length(pts[i], pts[i-1]);
  // }

  // return total_length;
} 

function segment_length (a, b) {
  return Math.sqrt( (a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) );
}

function discrete_points_path (xpts, ypts, N) {

  pts = _.zip(xpts, ypts);

  // compute resolution by dividing path length by number of points
  let r = compute_path_length(pts) / N;

  let pos = pts[0];

  return _.range(N).map( (a, i) => {

    let to_travel = r;
    let to_next_point = segment_length(pos, pts[i]);
    
    while (to_travel > to_next_point) {
      pos = pts[i++]; // move to next point and increment i
      to_travel -= to_next_point;
      to_next_point = segment_length(pos, pts[i]);
    }

    pos = lin_interp(dist, pos, pt_next);
    return pos;
  });
}

window.onload = function () {

  // get canvas context, draw grid
  svg = document.getElementById('draw-on-me-svg');
  svg.setAttribute('width', 800);
  svg.setAttribute('height', 400);

  path_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(path_group);
  path_elem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path_group.appendChild(path_elem);
  path_elem.setAttribute('stroke', '#aaa');
  path_elem.setAttribute('stroke-width', '2');
  path_elem.setAttribute('fill', 'transparent');

  // draw grid, maybe

  svg.addEventListener('mousedown', start_draw);
  svg.addEventListener('mousemove', draw_points);
  svg.addEventListener('mouseup', end_draw);
}

function start_draw (e) {
  if (drawing) return false; // this shouldn't happen, but just in case
  //sketch.clear_grid();
  drawing = true;

  xlast = null; ylast = null;
  xpts = []; ypts = [];

  let x = e.clientX - svg.offsetLeft;
  let y = e.clientY - svg.offsetTop;
  
  add_points(x, y);
}

function draw_points (e) {
  if (!drawing) return false;

  let x = e.clientX - svg.offsetLeft;
  let y = e.clientY - svg.offsetTop;
  
  add_points(x, y);
}

function end_draw (e) {
  if (!drawing) return false; // this shouldn't happen, but just in case
  drawing = false;
}

function add_points(x, y) {
  xpts.push(x); ypts.push(y);

  // connect last point to this point
  if (xpts.length == 1) {
    path_elem.setAttribute('d', 'M' + x + ' ' + y);
  } else {
    let current_path = path_elem.getAttribute('d');
    path_elem.setAttribute('d', current_path + ' L ' + x + ' ' + y);
  }

  xlast = x; ylast = y;
}