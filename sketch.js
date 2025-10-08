/* 
Animated orb reacting to audio using Tone.js and p5.js
-----------------------------------------------------------
The orb surface deforms with Perlin noise and reacts to 
three frequency bands from an mp3 (low, mid, high):
- Low frequencies affect the top part.
- Mid frequencies affect the middle.
- High frequencies affect the bottom.
*/

import * as Tone from "tone";

let player, fft;
let orbX = 40;
let orbY = 60;
let radius = 160;
let vertices = [];
let indices = [];
let noiseOffset = 0;
let noiseScale = 0.9;
let noiseStrength = 40;
let noiseSpeed = 0.5;
let noiseRotation = 0.002;

let rotationX = -0.4;
let rotationY = 0.4;
let cameraDistance = 100;

async function setup() {
  createCanvas(innerWidth, innerHeight, WEBGL);
  buildOrb();
  noiseDetail(4, 0.5);
  noiseOffset = random(1000);

  // Wait for user interaction to start audio
  const startButton = createButton("▶ Start Music + Animation");
  startButton.position(20, 20);
  startButton.style("padding", "10px 20px");
  startButton.mousePressed(async () => {
    await setupAudio();
    startButton.remove();
  });
}

async function setupAudio() {
  // Load and play your MP3 file (place in /public or same folder)
  player = new Tone.Player("music.mp3").toDestination();
  fft = new Tone.FFT(128);
  player.connect(fft);

  await Tone.start(); // Required for browsers
  player.start();
}

function draw() {
  background(10, 15, 20);
  translate(0, 0, -cameraDistance);
  rotateY((rotationY += noiseRotation));
  rotateX(rotationX);
  noStroke();

  // Get frequency data
  let spectrum = fft ? fft.getValue() : [];

  // Split into 3 bands: low, mid, high
  let low = getAvg(spectrum, 0, 10);
  let mid = getAvg(spectrum, 11, 40);
  let high = getAvg(spectrum, 41, 127);

  beginShape(TRIANGLES);
  let t = millis() * 0.001 * noiseSpeed;

  for (let tri of indices) {
    for (let idx of tri) {
      let v = vertices[idx];

      let n = noise(
        v.x * noiseScale + noiseOffset,
        v.y * noiseScale,
        v.z * noiseScale + t
      );

      let r = radius + n * noiseStrength;

      // Determine which part of orb this vertex belongs to
      let yNorm = (v.y + 1) / 2; // 0 bottom → 1 top
      let pulse = 0;

      // Apply frequency-based deformation
      if (yNorm > 0.66) pulse = map(low, -100, 0, 0, 50);    // top = bass
      else if (yNorm > 0.33) pulse = map(mid, -100, 0, 0, 40); // middle = mids
      else pulse = map(high, -100, 0, 0, 30);                  // bottom = highs

      vertex(v.x * (r + pulse), v.y * (r + pulse), v.z * (r + pulse));
    }
  }
  endShape();
}

// Helpers
function getAvg(arr, from, to) {
  if (!arr.length) return 0;
  let slice = arr.slice(from, to);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// Build sphere mesh
function buildOrb() {
  vertices = [];
  indices = [];
  for (let lat = 0; lat <= orbX; lat++) {
    let angleA = map(lat, 0, orbX, 0, PI);
    for (let lon = 0; lon <= orbY; lon++) {
      let angleB = map(lon, 0, orbY, 0, TWO_PI);
      let x = sin(angleA) * cos(angleB);
      let y = cos(angleA);
      let z = sin(angleA) * sin(angleB);
      vertices.push(createVector(x, y, z));
    }
  }
  for (let lat = 0; lat < orbX; lat++) {
    for (let lon = 0; lon < orbY; lon++) {
      let i1 = lat * (orbY + 1) + lon;
      let i2 = i1 + orbY + 1;
      indices.push([i1, i2, i1 + 1]);
      indices.push([i1 + 1, i2, i2 + 1]);
    }
  }
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
}
