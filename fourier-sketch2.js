"use strict";

/* for plotting */
let svg;              // container element for graph
let svg_dom;          // svg DOM element
let svg_signal;       // user-drawn 'analog' path
let svg_signal_pts;   // array of points (graph coords) for analog path
let svg_samples;      // array svg circles representing signal samples
let svg_uc_cont;      // continuous unit circle
let svg_uc_discrete;  // array of svg circles (discrete pts along unit circle)
let svg_vec_sample;   // vector pointing to highlighted sample
let svg_vec_uc;       // vector pointing to highlight point on unit circle
let svg_vec_product;  // product of svg_vec_sample and svg_vec_uc
let svg_n_labels;     // label some points on the signal
let svg_moving_circs; // circular components of signal
let svg_moving_pts;   // points on circular components of signal

let n, k;           // keep track of which sample / frequency to display
let N = 200;        // sampling frequency (number of points)
let samples;        // discrete signal sampled at frequency N
let u_circle;       // N discrete points around unit circle

/* hide/show elements */
let drawing = false;  // will be true when mouse is down and drawing
let show_vecs = true; // when true, draw vector to traversed points in mode 1
let show_prod = true; // when true, plot product of sample and e^jx
let show_n = false;   // when true, label a few points along the signal

let mode = 0;       // keep track of modes (see below)
                    // mode 0: drawing analog signal
                    // mode 1: traverse sampled signal
                    // mode 2: show other crap
let seen_modes = 0; // keep track of the modes we've been through

let col_samp = '#FF6666';   // color of sample pt/vec
let col_uc = '#0080FF';     // color of circle pt/vec
let col_prod = '#999';      // color of product pt/vec

let freqs;          // array of frequency components (result of DFT)
let freqs_vecs;     // vectors from freqs rotated according to n
let freqs_incs;     // amount to rotate each vec in freqs_vecs at each time step

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

g.setup( {'x':[-3, 3], 'y':[-2.5, 2.5], 'w':600, 'h':500, 'cx':0.5, 'cy':0.5} );

/* some additional functionality for d3 selections */
d3.selection.prototype.tofront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.viz = function(on_off) {
  let visibility = on_off ? 'visible' : 'hidden';
  return this.style('visibility', visibility);
}

window.onload = function () {

  // render katex
  let elem = document.getElementById('dft-katex');
  katex.render('X_{k} = \\sum\\limits_{n=0}^{N-1}x_{n}e^{-2\\pi jkn/N}', elem,
    {displayMode: true});

  // get canvas context, draw grid
  svg = d3.select('#draw-on-me-svg')
      .attr('width', g.w)
      .attr('height', g.h);
  svg_dom = svg[0][0]

  // create grid axis
  let s, e;
  s = g([0, g.y[0]]); e = g([0, g.y[1]]);
  svg.append('line')
      .attr('x1', s[0]).attr('y1', s[1])
      .attr('x2', e[0]).attr('y2', e[1])
      .attr('stroke', '#FFD8D5');
  svg.append('text')
      .attr('x', e[0] + 5)
      .attr('y', e[1] + 15)
      .text('Im')
      .attr('fill', '#BFBFBF');

  s = g([g.x[0], 0]); e = g([g.x[1], 0]);
  svg.append('line')
      .attr('x1', s[0]).attr('y1', s[1])
      .attr('x2', e[0]).attr('y2', e[1])
      .attr('stroke', '#FFD8D5');
  svg.append('text')
      .attr('x', e[0] - 20)
      .attr('y', e[1] - 5)
      .text('Re')
      .attr('fill', '#BFBFBF');

  // create svg path element representing analog signal
  svg_signal = svg.append('path')
      .attr('stroke', '#aaa')
      .attr('fill', 'transparent')
  svg_signal_pts = [];

  ready_draw();

  // start listening for keyboard commands
  document.addEventListener('keydown', handle_keys);
}

/* Add event listeners for drawing the 'analog' signal */
function ready_draw () {
  mode = 0;
  seen_modes = 0;
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

/* Given a complex number, get N discrete points on the corresponding circle */
function discrete_circle_from_vector (x, y, N) {
  // complex number representing circle of certain magnitude and phase
  let vec = [x, y];

  // vector at angle tau/N. multiply a unit vector by this quantity to move
  // around the circle in discrete increments.
  let inc = [ Math.cos(tau / N), Math.sin(tau / N) ];

  return xrange(N).map( a => vec = cpx_mult(vec, inc) );
  // return [vec, ...(xrange(N-1).map( a => vec = cpx_mult(vec, inc) ))];
}

/* Initialize n and k, draw discrete unit circle on UI */
function setup_visual_transform () {
  if (drawing || svg_signal_pts.length == 0) return;
  
  mode = 1;     // entering traverse signal mode
  cleanup_for_mode(mode);
  if (seen_modes >= 1) return;
  seen_modes = 1;

  n = 0; k = 1;
  // draw unit circle and plot N discrete points *clockwise* around circle.
  // reverse the array so points are clockwise, not counter-clockwise.
  u_circle = discrete_circle_from_vector(1, 0, N).reverse();
  svg_uc_cont = plot_unit_circle();
  svg_uc_discrete = plot_discrete_points(u_circle);

  svg_vec_sample = plot_add_vector([0, 0], [0, 0], col_samp);
  svg_vec_uc = plot_add_vector([0, 0], [0, 0], col_uc);
  if (show_prod)
    svg_vec_product = plot_add_vector([0, 0], [0, 0], col_prod)
  plot_highlight_point_pair();
}

/* Given a step (usually +1 or -1), increment n and highlight appropriate
 * samples on signal and unit circle. */
function traverse_signal (inc) {
  plot_unhighlight_point_pair();
  n += inc; if (n < 0) n = N - 1; else if (n == N) n = 0;
  plot_highlight_point_pair();
  return false;
}

/* Given a step (usually +1 or -1), increment k and highlight appropriate
 * samples on signal and unit circle. */
function change_freq (inc) {
  plot_unhighlight_point_pair();
  k += inc; if (k < 0) k = N - 1; else if (k == N) k = 0;
  plot_highlight_point_pair();
  return false;
}

function transform_signal (pts) {
  let xpts = pts.map( a => a[0]);
  let ypts = pts.map( a => a[1]);
  return dft_direct(xpts, ypts);
}

function setup_component_circles () {
  mode = 2;
  cleanup_for_mode(mode);
  if (seen_modes == 2) return;
  seen_modes = 2;

  // compute the actual transform
  freqs = transform_signal(samples);

  // initialize freqs_incs and freqs_vecs
  freqs_incs = freqs.map( (a, k) => 
    [ Math.cos(tau * k / N), Math.sin(tau * k / N) ]);
  freqs_vecs = freqs.map( a => cpx_mult(a, [1/N, 0]) );

  svg_moving_circs = plot_circles_from_vectors(N, freqs);

  // create points that will move along circles that compose signal
  svg_moving_pts = svg.selectAll('nah')
      .data(add_vectors_cummulative(freqs_vecs))
    .enter()
      .append('circle')
      .attr('r', (d, i) => i < N-1 ? 1 : 4)
      .attr('fill', (d, i) => i < N-1 ? 'black' : '#0080FF')
      .attr('cx', d => g(d)[0])
      .attr('cy', d => g(d)[1]);

}

// switch back into drawing mode
function setup_drawing () {
  mode = 0;
  cleanup_for_mode(mode);
}

function traverse_transform (inc) {
  // update moving points
  freqs_vecs = freqs_vecs.map( (a, i) => 
    cpx_mult(a, [freqs_incs[i][0], inc*freqs_incs[i][1]]) );
  let vecs = add_vectors_cummulative(freqs_vecs);

  svg_moving_circs.data(g([0, 0], ...vecs.slice(0, N) ))
      .attr('cx', d => d[0])
      .attr('cy', d => d[1])

  svg_moving_pts.data(g(...vecs))
      .attr('cx', d => d[0])
      .attr('cy', d => d[1]);

  return false;
}


/* Add array of vectors such that each element of the returned array is the sum
 * up to that point. See below for example
 * Given:  [A, B, C, D]
 * Return: [A, A+B, A+B+C, A+B+C+D] */
function add_vectors_cummulative (vectors) {
  let sum = [0,0];
  return vectors.map( v => sum = cpx_add(sum, v) );
}


/* DRAWING (DISPLAY MODE) */

/* Switch into drawing mode. Create (empty) array of points of points
 * representing the analog signal. Add first point to array and plot. */
function start_draw (e) {
  if (mode) return;
  drawing = true;
  cleanup_all(false);
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

  if (svg_signal_pts.length == 1) return false;

  samples = discrete_points_path(svg_signal_pts, N, false);
  svg_samples = plot_discrete_points(samples);
  svg_n_labels = create_n_labels();
  show_n = true; toggle_n_labels();
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

/* un-highlight points */
function plot_unhighlight_point_pair () {
  let n2 = n * k % N;
  svg_samples[n]
      .attr('r', '1.5')
      .attr('fill', 'black');
  svg_uc_discrete[n2]
      .attr('r', '1.5')
      .attr('fill', 'black');
}

/* highlight points */
function plot_highlight_point_pair () {
  let n2 = n * k % N;
  let vec1 = svg_samples[n];
  let vec2 = svg_uc_discrete[n * k % N];

  console.log(svg_uc_discrete);

  if (show_vecs) {
    svg_vec_sample
        .attr('x2', vec1.attr('cx'))
        .attr('y2', vec1.attr('cy'))
        .tofront()
    svg_vec_uc
        .attr('x2', vec2.attr('cx'))
        .attr('y2', vec2.attr('cy'))
        .tofront()

    if (show_prod) {
      let prod = g(cpx_mult(samples[n], u_circle[n * k % N]));
      svg_vec_product
        .attr('x2', prod[0])
        .attr('y2', prod[1])
    }

    // update display
    /*
    d3.select('#fourier-component')
        .text(construct_component_latex(n, k, N));*/

    let elem = document.getElementById('fourier-component');
    katex.render(construct_component_latex(n, k, N), elem, {displayMode: true});
    //MathJax.Hub.Queue(["Typeset",MathJax.Hub,"fourier-component"]);
    /*MathJax.Hub.Queue(
      ["Typeset",MathJax.Hub,"DivID"],
      function () {
        d3.select('#fourier-component')
            .style('visibility', 'visible');
        }
    )*/
  }

  vec1
      .attr('r', '4')
      .attr('fill', col_samp)
      .tofront();
  vec2
      .attr('r', '4')
      .attr('fill', col_uc)
      .tofront();
}

function plot_add_vector (s, e, color) {
  // [s, e] = g(s, e);  // es6 only
  s = g(s); e = g(e);
  color = color || 'black';
  return svg.append('line')
      .attr('x1', s[0])
      .attr('x2', e[0])
      .attr('y1', s[1])
      .attr('y2', e[1])
      .attr('stroke', color)
}

function plot_circles_from_vectors (num, freqs) {
  let c = [0,0];
  xrange(num).map( i => {
    let vec = cpx_mult(freqs[i], [1/N, 0]);
    plot_circle_from_vector(vec, c);
    c = cpx_add(c, vec);
  });
  return svg.selectAll('.freq-circle')
}

function plot_circle_from_vector (vec, c) {
  c = g(c);

  return svg.append('circle')
      .attr('cx', c[0])
      .attr('cy', c[1])
      .attr('r', g([euclid_norm(vec), 0])[0] - g([0,0])[0])
      .attr('stroke', '#ddd')
      .attr('fill', 'transparent')
      .attr('class', 'freq-circle');
}

/* Returns a line generator -- when passed in an array of points, outputs the
 * appropriate path data. uses default accessors and linear interpolation */
let make_line_from_pts = d3.svg.line();

function cleanup_all (keep_signal) {
  seen_modes = 0;
  if (!keep_signal) {
    svg_signal_pts = [];
    svg_signal.attr('d', '');
  }
  if (svg_samples) svg_samples.map( a => a.remove() );
  if (svg_uc_discrete) svg_uc_discrete.map( a => a.remove() );
  if (svg_uc_cont) svg_uc_cont.remove();
  if (svg_vec_sample) svg_vec_sample.remove();
  if (svg_vec_uc) svg_vec_uc.remove();
  if (svg_vec_product) svg_vec_product.remove();
  if (svg_n_labels) svg_n_labels.map( a => a.remove() );
  if (svg_moving_circs) svg_moving_circs.remove();
  if (svg_moving_pts) svg_moving_pts.remove();
}

function cleanup_for_mode (mode) {
  if (mode == 0) {
    if (svg_samples) svg_samples.map( a =>
      a.viz(true).attr('r', '1.5').attr('fill', 'black') );
    if (svg_uc_discrete) svg_uc_discrete.map( a => a.viz(false) );
    if (svg_uc_cont) svg_uc_cont.viz(false);
    if (svg_vec_sample) svg_vec_sample.viz(false);
    if (svg_vec_uc) svg_vec_uc.viz(false);
    if (svg_vec_product) svg_vec_product.viz(false);
    // if (svg_n_labels) svg_n_labels.map( a => a.viz(false) );
    if (svg_moving_circs) svg_moving_circs.viz(false);
    if (svg_moving_pts) svg_moving_pts.viz(false);
  
  } else if (mode == 1) {
    if (svg_samples) svg_samples.map( a => a.viz(true) );
    if (svg_uc_discrete) svg_uc_discrete.map( a => a.viz(true) );
    if (seen_modes >= 1) plot_highlight_point_pair();
    if (svg_uc_cont) svg_uc_cont.viz(true);
    if (svg_vec_sample) svg_vec_sample.viz(true);
    if (svg_vec_uc) svg_vec_uc.viz(true);
    if (svg_vec_product) svg_vec_product.viz(true);
    // if (svg_n_labels) svg_n_labels.map( a => a.viz(false) );
    if (svg_moving_circs) svg_moving_circs.viz(false);
    if (svg_moving_pts) svg_moving_pts.viz(false);
  
  } else if (mode == 2) {
    if (svg_samples) svg_samples.map( a => a.viz(false) );
    if (svg_uc_discrete) svg_uc_discrete.map( a => a.viz(false) );
    if (svg_uc_cont) svg_uc_cont.viz(false);
    if (svg_vec_sample) svg_vec_sample.viz(false);
    if (svg_vec_uc) svg_vec_uc.viz(false);
    if (svg_vec_product) svg_vec_product.viz(false);
    // if (svg_n_labels) svg_n_labels.map( a => a.viz(false) );
    if (svg_moving_circs) svg_moving_circs.viz(true);
    if (svg_moving_pts) svg_moving_pts.viz(true);
  }

}

function viz (elem, on_off) {
  let visibility = on_off ? 'visible' : 'hidden';
  a.style()
}

function create_n_labels () {
  return svg_samples.map( function (a, i) {
    if (i % 10 && i != N-1) return false;
    return svg.append('text')
        .attr('x', parseInt(a.attr('cx')) + 5)
        .attr('y', parseInt(a.attr('cy')) + 2)
        .attr('class', 'n-label')
        .text('n = ' + i);
  }).filter( a => a);
}

function toggle_n_labels () {
  if (show_n) {
    show_n = false;
    d3.selectAll('.n-label').style('visibility', 'hidden');
  } else {
    show_n = true;
    d3.selectAll('.n-label').style('visibility', 'visible');
  }
}

function toggle_resolution () {
  if (N == 50) N = 100;
  else if (N == 100) N = 200;
  else if (N == 200) N = 50;

  // resample analog signal
  cleanup_all(true);
  seen_modes = 0;
  samples = discrete_points_path(svg_signal_pts, N, false);
  svg_samples = plot_discrete_points(samples);
  svg_n_labels = create_n_labels();

  show_n = show_n ? false : true;
  toggle_n_labels();
}

/* CONTROL */
function handle_keys (e) {

  let code = e.which;

  // TODO: get rid of this
  let focus_svg = true;

  if (mode == 0) {
    if (code == 13 && focus_svg) setup_visual_transform();
    else if (code == 82) toggle_resolution();

  } else if (mode == 1) {
    if (code == 13 && focus_svg) setup_component_circles();
    else if (code == 39 && focus_svg) traverse_signal(1);
    else if (code == 37 && focus_svg) traverse_signal(-1);
    else if (code == 38 && focus_svg) change_freq(1);
    else if (code == 40 && focus_svg) change_freq(-1);
  
  } else if (mode == 2) {
    if (code == 13 && focus_svg) setup_drawing();
    else if (code == 39 && focus_svg) traverse_transform(1);
    else if (code == 37 && focus_svg) traverse_transform(-1);
  }



  if (code == 78) toggle_n_labels();
}

function construct_component_latex (n, k, N) {
  return 'x_{' + n + '}e^{-2\\pi j(' + k + ')(' + n +'/' + N + ')}';
}