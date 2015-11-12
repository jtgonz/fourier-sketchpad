"use strict";

/* for plotting */
let svg;              // container element for graph
let svg_dom;          // svg DOM element
let svg_signal;       // user-drawn 'analog' path
let svg_signal_pts;   // array of points (graph coords) for analog path
let svg_samples;      // array svg circles representing signal samples
let svg_uc_cont;      // continuous unit circle
let svg_uc_discrete;  // array of svg circles (discrete pts along unit circle)

let N = 100;        // sampling frequency (number of points)
let samples;        // discrete signal sampled at frequency N

let n, k;           // keep track of which sample / frequency to display

let drawing;        // will be true when mouse is down and drawing

/* Holds graph info. Convert points from 'math mode' to 'display mode' */
function g (pt) {
  if (arguments.length == 1)
    return [pt[0] * g.x_sc + g.x_md, -1 * pt[1] * g.y_sc + g.y_md]
  else
    return [].map.call( arguments, a => g(a) );
};
g.setup = function (attrs) {
  Object.keys(attrs).forEach( k => g[k] = attrs[k] );
  g.x_sc = g.w / (g.x[1] - g.x[0]);
  g.y_sc = g.h / (g.y[1] - g.y[0]);
  g.x_md = (g.x[1] - g.x[0]) * g.cx * g.x_sc;
  g.y_md = (g.y[1] - g.y[0]) * g.cy * g.y_sc;
}
/* convert from display mode back to math mode */
g.inv = function (pt) {
  if (arguments.length == 1)
    return [(pt[0] - g.x_md) / g.x_sc, (pt[1] - g.y_md) / g.y_sc * -1]
  else
    return [].map.call( arguments, a => g.inv(a) );
}

g.setup( {'x':[-4, 4], 'y':[-2.5, 2.5], 'w':800, 'h':500, 'cx':0.5, 'cy':0.5} );

window.onload = function () {

  // get canvas context, draw grid
  svg = d3.select('#draw-on-me-svg')
      .attr('width', g.w)
      .attr('height', g.h);
  svg_dom = svg[0][0]

  // create svg path element representing analog signal
  svg_signal = svg.append('path')
      .attr('stroke', '#aaa')
      .attr('fill', 'transparent')

  ready_draw();
}

/* Add event listeners for drawing the 'analog' signal */
function ready_draw () {
  drawing = false;
  svg_dom.addEventListener('mousedown', start_draw);
  svg_dom.addEventListener('mousemove', continue_draw);
  svg_dom.addEventListener('mouseleave', end_draw);
  svg_dom.addEventListener('mouseup', end_draw);
}

/* MATH MODE */

/* This is essentially our sampling function. Input is in display coords,
 * output is in math coords. */
function discrete_points_path (pts, N, sample_last) {

  // compute resolution by dividing path length by number of points
  let r = compute_path_length(pts) / (N-sample_last);

  // Goal is to travel a distance r and record a point. Travel from point to
  // point in the array, and at each step, subtract that distance from r. When
  // the distance to the next point is smaller than r, interpolate between the
  // two points and record the position. That position is your new starting pos.

  let pos = pts[0];
  let i = 1;

  return xrange(N).map( n => {

    if (n == N-1 && sample_last) return pts[pts.length-1];

    let to_travel = n ? r : 0;  // if this is the first point, plot right away
    let to_next_point = segment_length(pos, pts[i]);
    
    while (to_travel > to_next_point) {
      pos = pts[i++];                 // move to next point and increment i
      to_travel -= to_next_point;     // subtract distance from travel dist
      to_next_point = segment_length(pos, pts[i]);  // calculate dist to next pt
    }

    // get point between pts[i-1] and pts[i]
    pos = lin_interp(to_travel, pos, pts[i]);

    // convert from display coords to math coords
    return g.inv(pos);
  });
}

/* Given an array of points, compute length of path joining them */
function compute_path_length (pts) {
  return xrange(pts.length - 1)
    .map( a => segment_length(pts[a], pts[a+1]) )
    .reduce( (a, b) => a + b);
}

/* Distance between two points */
function segment_length (a, b) {
  return Math.sqrt( (a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) );
}

/* Given a distance dist, and a line formed by two points s (start) and e (end),
 * return the point that is distance dist away from start point */
function lin_interp(dist, s, e) {
  if (!dist) return s; // avoid divde by zero
  let ratio = dist / segment_length(s, e);
  let x = ratio * (e[0]-s[0]) + s[0];
  let y = ratio * (e[1]-s[1]) + s[1];
  return [x, y];
}

/* Initialize n and k, draw discrete unit circle on UI */
function setup_visual_transform () {
  n = 0; k = 1;
  // draw unit circle and plot N discrete points *clockwise* around circle.
  // reverse the array so points are clockwise, not counter-clockwise.
  svg_uc_cont = plot_unit_circle();
  svg_uc_discrete = plot_discrete_points(
    discrete_circle_from_vector(1, 0, N).reverse());
}

/* Given a complex number, get N discrete points on the corresponding circle */
function discrete_circle_from_vector (x, y, N) {
  // complex number representing circle of certain magnitude and phase
  let vec = [x, y];

  // vector at angle tau/N. multiply a unit vector by this quantity to move
  // around the circle in discrete increments.
  let inc = [ Math.cos(tau / N), Math.sin(tau / N) ];

  return [vec, ...(xrange(N-1).map( a => vec = cpx_mult(vec, inc) ))];
}


/* DRAWING (DISPLAY MODE) */

/* Switch into drawing mode. Create (empty) array of points of points
 * representing the analog signal. Add first point to array and plot. */
function start_draw (e) {
  drawing = true;
  svg_signal_pts = [];
  if (svg_samples) svg_samples.map( a => a.remove() );
  add_points_from_mouse_event(e);
}

/* Check to make sure we're still in drawing mode. Add point to array of points
 * representing analog signal and plot the interpolated line. */
function continue_draw (e) {
  if (!drawing) return false;
  add_points_from_mouse_event(e);
}

function end_draw (e) {
  if (!drawing) return false;
  drawing = false;

  samples = discrete_points_path(svg_signal_pts, N, false);
  svg_samples = plot_discrete_points(samples);

  setup_visual_transform();
}

function add_points_from_mouse_event(e) {
  let x = e.clientX - svg_dom.offsetLeft;
  let y = e.clientY - svg_dom.offsetTop;
  svg_signal_pts.push([x, y]);
  svg_signal
      .datum(svg_signal_pts)
      .attr('d', make_line_from_pts);
}

/* Convert from math coordinates to display coordinates and draw circles at
 * points in array */
function plot_discrete_points (pts) {
  return g(...pts).map( a =>
    svg.append('circle')
        .attr('cx', a[0])
        .attr('cy', a[1])
        .attr('r', 1.5)
    );
}

function plot_unit_circle () {
  let c = g([0, 0]);
  let r = g([1, 0]);
  return svg.append('circle')
      .attr('cx', c[0])
      .attr('cy', c[1])
      .attr('r', r[0]-c[0])
      .attr('fill', 'transparent')
      .attr('stroke', '#bbb');
}

/* Returns a line generator -- when passed in an array of points, outputs the
 * appropriate path data. uses default accessors and linear interpolation */
let make_line_from_pts = d3.svg.line();

/* CONTROL */
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