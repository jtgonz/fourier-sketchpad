"use strict";

/* okay, let's try this again... */

// user will draw a path (either svg or canvas, who knows). points on that path
// will be given in two arrays. a straight line connects every pair of adjacent
// points. (x_points = [10, 12, 15, ...], y_points = [45, 46, 45, ...])

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