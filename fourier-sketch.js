"use strict";

/* okay, let's try this again... */

// user will draw a path (either svg or canvas, who knows). points on that path
// will be given in two arrays. a straight line connects every pair of adjacent
// points. (x_points = [10, 12, 15, ...], y_points = [45, 46, 45, ...])

let xlast, ylast;
let xpts, ypts;
let grid_space = 10;

let width = 800; let height = 500;
let xmid = 40; let ymid = 25;

let svgns = 'http://www.w3.org/2000/svg';

let drawing = false; // set to true when mouse is down and drawing on grid

// resolution of signal (how many points to sample)
let N = 100;

// for keeping track of individual points as we traverse through the signal
let n = 0; let k = 1;

/* SVG elements */
let svg, path_group, path_elem;
let path_points_elem;
let svg_unit_circle;

// arrays of svg circle elements representing discrete points on path/circle
let svg_signal_pts, svg_unit_circle_pts;



function handle_keys (e) {

  let code = e.which;

  // TODO: get rid of this
  let focus_svg = true;
  let mode = 1;

  if (code == 13 && focus_svg) setup_visual_transform();
  else if (code == 39 && focus_svg && mode == 1) traverse_signal(1);
  else if (code == 37 && focus_svg && mode == 1) traverse_signal(-1);
  else if (code == 38 && focus_svg && mode == 1) change_freq(1);
  else if (code == 40 && focus_svg && mode == 1) change_freq(-1);
}

/* Compute DFT for signal, draw discrete unit circle on UI */

/* Initialize n and k, draw discrete unit circle on UI */
function setup_visual_transform () {
  n = 0; k = 1;
  // draw unit circle and plot N discrete points clockwise around circle. After
  // creating the discrete points, we have to scale them by 10*grid_space
  svg_unit_circle = svg_draw_circle(xmid * grid_space, ymid * grid_space,
    10 * grid_space, '#bbb', 'transparent');
  svg_unit_circle_pts =
    plot_discrete_points(discrete_circle_from_vector(1, 0, N).map( a => 
      [10*grid_space*a[0]+xmid*grid_space, -10*grid_space*a[1]+ymid*grid_space]
    ))[1];
}

/* Given a step (usually +1 or -1), increment n and highlight appropriate
 * samples on signal and unit circle. */
function traverse_signal (inc) {
  dehighlight();
  n += inc; if (n < 0) n = N - 1; else if (n == N) n = 0;
  highlight();
  return false;
}

/* Given a step (usually +1 or -1), increment k and highlight appropriate
 * samples on signal and unit circle. */
function change_freq (inc) {
  dehighlight();
  k += inc; if (k < 0) k = N - 1; else if (k == N) k = 0;
  highlight();
  return false;
}

// de-highlight points
function dehighlight () {
  svg_highlight_circle(svg_signal_pts[n], 1.5, '', 'black', false);
  svg_highlight_circle(svg_unit_circle_pts[n * k % N], 1.5, '', 'black', false);
}

// highlight points
function highlight () {
  svg_highlight_circle(svg_signal_pts[n], 4, '', '#FF6666', true);
  svg_highlight_circle(svg_unit_circle_pts[n * k % N], 4, '', '#FF6666', true);
}

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

  return xrange(N).map( n => {

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

// function plot_discrete_points (xpts, ypts, N, sample_last) {
//   let pts = discrete_points_path(xpts, ypts, N, sample_last);

//   _(pts).forEach( a => {
//     let g = document.createElementNS(svgns, 'g');
//     svg.appendChild(g);
//     let c = document.createElementNS(svgns, 'circle');
//     g.appendChild(c);
//     c.setAttribute('cx', a[0]);
//     c.setAttribute('cy', a[1]);
//     c.setAttribute('r', 1.5);
//   });
// }

function plot_discrete_points (pts) {
  let g = document.createElementNS(svgns, 'g');
  svg.appendChild(g);
  return [g, pts.map( a => svg_draw_circle(a[0], a[1], 1.5, null, null, g) )];
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

function svg_draw_line (x1, x2, y1, y2, color) {
  let line = document.createElementNS(svgns, 'line');
  line.setAttribute('x1', x1.toString());
  line.setAttribute('x2', x2.toString());
  line.setAttribute('y1', y1.toString());
  line.setAttribute('y2', y2.toString());
  line.setAttribute('stroke', color);
  svg.appendChild(line);
}

function svg_draw_circle (cx, cy, r, stroke, fill, parent) {
  let c = document.createElementNS(svgns, 'circle');
  c.setAttribute('cx', cx);
  c.setAttribute('cy', cy);
  svg_highlight_circle(c, r, stroke, fill, false);

  let p = parent || svg;
  p.appendChild(c);

  return c;
}

function svg_highlight_circle (circle, r, stroke, fill, reorder) {
  circle.setAttribute('r', r);
  circle.setAttribute('stroke', stroke);
  circle.setAttribute('fill', fill);
  if (reorder) circle.parentNode.appendChild(circle);
}

function start_draw (e) {
  if (drawing) return false; // this shouldn't happen, but just in case
  //sketch.clear_grid();
  drawing = true;

  if (path_points_elem) svg.removeChild(path_points_elem);

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

  // plot svg circle elements along signal
  let p = plot_discrete_points(discrete_points_path(xpts, ypts, 100, false));
  path_points_elem = p[0];
  svg_signal_pts = p [1];

  document.addEventListener('keydown', handle_keys);
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
  // translate points so the re and im axes are in the center of the page
  xpts = xpts.map( a => (a - xmid*grid_space) / (10 * grid_space) );
  ypts = ypts.map( a => (a - ymid*grid_space) / (10 * grid_space) );
  
  return dft_direct(xpts, ypts);
}

/* plot vector on svg element */
function plot_vector (x, y) {

}

/* Given a complex number, plot circle with corresponding magnitude and phase */
function plot_circle_from_vector (x, y) {
  //
}

/* Given a complex number, get N discrete points on the corresponding circle */
function discrete_circle_from_vector (x, y, N) {

  // complex number representing circle of certain magnitude and phase
  let vec = [x, y];

  // vector at angle tau/N. multiply a unit vector by this quantity to move
  // around the circle in discrete increments. (complex multiplication adds
  // angles). Note that the im component is negative, so we move clockwise
  let inc = [ Math.cos(tau / N), -1 * Math.sin(tau / N) ];

  return [vec, ...(_.range(N-1).map( a => vec = cpx_mult(vec, inc) ))];
}

// if user presses enter, then we (1) do the DFT, and (2), plot a circle w/ k=1
// user can press up/down to change k and left/right to go through n

// select the appropriate sample depending on n.
// make the dot bigger/change color/might need to reorder also
// draw vectors? perhaps