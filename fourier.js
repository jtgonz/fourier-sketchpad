/*
Various Fourier Transforms (dft, fft, stft)

Not the fastest code, since I wanted to try writing in a functional style. We
waste time iterating over arrays for multiple map/reduce/filter operations -- a
more optimized version should probably use loops or MATLAB-style vectorized
arithmetic (not sure how to do that in JavaScript though).

Reference for FFT: http://web.eecs.umich.edu/~fessler/course/451/l/pdf/c6.pdf
*/

"use strict";

let tau = 2 * Math.PI;  // giving this a shot (http://tauday.com/tau-manifesto)

// Generator function similar to Python xrange. It looks nice, but unfortunately
// it's not very performant (see link).
// http://jsperf.com/native-vs-underscore-vs-lodash-vs-xrange */
function xrange(n) {
  let a = {};
  a[Symbol.iterator] = function* (fn) {
    let i = 0;
    while (i < n)
      yield fn ? fn(i++) : i++;
  };
  a.map = fn => [...a[Symbol.iterator](fn)];
  return a;
}

/* Return an array of N equally spaced points around the unit circle */
function discrete_circle (N) {
  let W = [];
  // IMPORTANT! sin(x) needs to be multplied by negative one. Remember, this
  // is supposed to represent e^-jx, we are going around the unit circle
  // backwards (clockwise). Without this, we get incorrect results for cpx nums
  for (let m of xrange(N)) {
    W[m] = [Math.cos(tau * m / N), -1 * Math.sin(tau * m / N)];
  }
  return W;
}

/* Direct computation of Discrete Fourier Transform */
function dft_direct (re, im) {
  let N = re.length;
  // is this necessary? should be able to do DFT with any N
  //if (N.toString(2) % 10) return; // check that N is a power of 2

  // array containing N evenly spaced points around the unit circle
  let W = discrete_circle(N);

  // debugger;
  // initialize imaginary values to zero if not provided
  im = im || re.map( a => 0 );

  // sum (x * W) over N points (0 to N-1), for all frequencies k in N
  return re.map( (_, k) =>
         re.map( (_, n) => cpx_mult([re[n], im[n]], W[n * k % N]) )
           .reduce( (a, b) => cpx_add(a, b) ));
}

/* Radix-2 Fast Fourier Transform (Cooley-Tukey algorithm) */
function fft_rx2 (re, im) {
  let N = re.length;
  if (N.toString(2) % 10) // return immediately if N is not power of 2
    return;
  else if (N <= 32)       // if N is sufficiently small, compute dft directly
    return dft_direct(re, im);

  let W = discrete_circle(N); // N evenly spaced points around the unit circle
  im = im || re.map( a => 0 ); // set imaginary values to zero if not provided

  // compute N/2-point DFT for even and odd samples of input array
  let S_1 = fft_rx2(...[re, im].map( a => a.filter( (_, i) => !(i % 2) ) ));
  let S_2 = fft_rx2(...[re, im].map( a => a.filter( (_, i) => i % 2 ) ));

  // mutiply by twiddle factor. later, exploit symmetry W[k+N/2] = -W[k]
  let G_2 = S_2.map( (a, k) => cpx_mult(a, W[k % N]) );

  // combine for all frequencies k in N/2-1
  let X = [];
  for (let k of xrange(N/2)) {
    X[k] = cpx_add(S_1[k], G_2[k]);
    X[k + N/2] = cpx_sub(S_1[k], G_2[k]);
  }

  return X;
}

/* Short-Time Fourier Transform */
function stft (re, im, N, h) {
  N = N || 2048; h = h || 441; // default window and hop size
  im = im || re.map( a => 0 ); // set imaginary values to zero if not provided
  if (N.toString(2) % 10) return; // check that N is a power of 2

  // calculate number of frames (evaluate fft on each frame)
  frames = Math.floor((re.length - N) / h);

  // hamming window will attenuate edges of frame
  let w = hamming_window(N);

  // for each frame in signal, multiply by hamming window and compute fft
  return xrange(frames).map( n =>
    fft_rx2( w.map((a, i) => a * re[n*h+i]), w.map((a, i) => a * im[n*h+i]) ));
}

/* Call stft(), but return magnitudes instead of complex numbers */
function stft_magnitude (re, im, N, h) {
  return stft(re, im, N, h).map( a => get_magnitudes(a) );
}

// get normalized frequencies


/* Utilities */
/* Get array of magnitudes from complex-valued array */
function get_magnitudes (x) { return x.map( a => euclid_norm(a) ); }

function hamming_window (N) {
  return xrange(N).map( a => 0.54 - 0.46 * Math.cos(tau*a/N) );
}
function sample_sine_wave (k, N) {
  return xrange(N).map( i => Math.sin(tau*(k||10)*i/(N||2048)) );
}
function cpx_mult(a, b) {
  return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]];
}
function cpx_add(a, b) {
  return [a[0]+b[0], a[1]+b[1]];
}
function cpx_sub(a, b) {
  return [a[0]-b[0], a[1]-b[1]];
}
function euclid_norm (a) {
  return Math.sqrt(a[0]*a[0] + a[1]*a[1]);
}