"use strict";

/* okay, let's try this again... */

// user will draw a path (either svg or canvas, who knows). points on that path
// will be given in two arrays. a straight line connects every pair of adjacent
// points. (x_points = [10, 12, 15, ...], y_points = [45, 46, 45, ...])

let xlast, ylast;
let xpts, ypts;
let grid_space = 10;

let width = 800; let height = 400;
let xmid = 40; let ymid = 20;

let svg, path_group, path_elem;
let svgns = 'http://www.w3.org/2000/svg';

let drawing = false; // set to true when mouse is down and drawing on grid

function compute_path_length (pts) {
  return _.range(0, pts.length - 1)
    .map( a => segment_length(pts[a], pts[a+1]) )
    .reduce( (a, b) => a + b);
} 

function segment_length (a, b) {
  return Math.sqrt( (a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) );
}

function discrete_points_path (xpts, ypts, N, sample_last) {

  let pts = _.zip(xpts, ypts);

  // compute resolution by dividing path length by number of points
  let r = compute_path_length(pts) / (N-sample_last);

  let pos = pts[0];
  let i = 1;

  return _.range(N).map( (a, n) => {

    if (n == N-1 && sample_last) return pts[pts.length-1];

    let to_travel = n ? r : 0;
    let to_next_point = segment_length(pos, pts[i]);
    
    while (to_travel > to_next_point) {
      pos = pts[i++]; // move to next point and increment i
      to_travel -= to_next_point;
      to_next_point = segment_length(pos, pts[i]);
    }

    pos = lin_interp(to_travel, pos, pts[i]);

    return pos;
  });
}

function lin_interp(dist, s, e) {

  if (!dist) return s; // avoid divde by zero

  let ratio = dist / segment_length(s, e);

  let x = ratio * (e[0]-s[0]) + s[0];
  let y = ratio * (e[1]-s[1]) + s[1];
  
  return [x, y];
}

function plot_discrete_points (xpts, ypts, N, sample_last) {
  let pts = discrete_points_path(xpts, ypts, N, sample_last);

  _(pts).forEach( a => {
    let g = document.createElementNS(svgns, 'g');
    svg.appendChild(g);
    let c = document.createElementNS(svgns, 'circle');
    g.appendChild(c);
    c.setAttribute('cx', a[0]);
    c.setAttribute('cy', a[1]);
    c.setAttribute('r', 1.5);
  });
}

window.onload = function () {

  // get canvas context, draw grid
  svg = document.getElementById('draw-on-me-svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  // draw grid lines and axes
  _.range(width / grid_space).forEach( (a, i) => {
    if (i == xmid) return;
    svg_draw_line(i*grid_space, i*grid_space, 0, height, '#DAF9FF');
  });
  _.range(height / grid_space).forEach( (a, i) => {
    if (i == ymid) return;
    svg_draw_line(0, width, i*grid_space, i*grid_space, '#DAF9FF');
  });
  svg_draw_line(xmid*grid_space, xmid*grid_space, 0, height, '#FFD7E0');
  svg_draw_line(0, width, ymid*grid_space, ymid*grid_space, '#FFD7E0');

  path_group = document.createElementNS(svgns, 'g');
  svg.appendChild(path_group);
  path_elem = document.createElementNS(svgns, 'path');
  path_group.appendChild(path_elem);
  path_elem.setAttribute('stroke', '#aaa');
  // path_elem.setAttribute('stroke-width', '2');
  path_elem.setAttribute('fill', 'transparent');
  // path_elem.setAttribute('stroke-linecap', 'round');

  // draw grid, maybe

  svg.addEventListener('mousedown', start_draw);
  svg.addEventListener('mousemove', draw_points);
  svg.addEventListener('mouseup', end_draw);
}

function svg_draw_line(x1, x2, y1, y2, color) {
  let line = document.createElementNS(svgns, 'line');
  line.setAttribute('x1', x1.toString());
  line.setAttribute('x2', x2.toString());
  line.setAttribute('y1', y1.toString());
  line.setAttribute('y2', y2.toString());
  line.setAttribute('stroke', color);
  svg.appendChild(line);
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



// draw unit circle, label points, create function that can highlight
// a point on the circle and a point on your curve
// also a function that calls that function

// and we actually need to do the dft

function transform_signal(xpts, ypts) {

  // let pts = discrete_points_path(xpts, ypts, N, sample_last);

  // translate points so the re and im axes are in the center of the page
  let xpts = _(xpts).map( a => a + xoff );
  let ypts = _(ypts).map( a => a + yoff );

  dft_direct(xpts, ypts);

}