/*
Drawing an animated orb  using noise and triangles...
-----------------------------------------------------------
The sketch draws a orb with a surface that deforms using
Perlin noise, which createsan organic and "wobbly" effect.
The orb rotates on the Y-axis, and the vertices are
displaced over time
*/

// Building the orb itself using x and y
let orbX = 40; // Horizontal building blocks
let orbY = 60; // Vertical building blocks
let radius = 160;
let vertices = []; // 3D points for the orb
let indices = []; // Storing the triangles

// Creating a unique noise pattern
let noiseOffset = 0;
let noiseScale = 0.9;
let noiseStrength = 40;
let noiseSpeed = 0.5;
let noiseRotation = 0.002; // Rotation speed

let rotationX = -0.4;
let rotationY = 0.4;
let cameraDistance = 100;

// Color palette and current color state
let colors = [
  [255, 100, 100],
  [100, 255, 200],
  [200, 150, 255],
  [255, 220, 120],
  [120, 220, 255],
  [255, 160, 220],
];
let currentColorIndex = 0;
let currentColor = colors[currentColorIndex];

// Mic audio (Tone.js)
let audioOn = false;
let mic, meter;
let audioLevel = 0;
let _lastAudioUpdate = 0;
const _audioUpdateMs = 33;
const _baseNoiseStrength = noiseStrength;
const _baseRadius = radius;
const _baseNoiseSpeed = noiseSpeed;
const _baseNoiseRotation = noiseRotation;

function setup() {
  createCanvas(innerWidth, innerHeight, WEBGL); // 3D Graphics
  buildOrb();
  noiseDetail(4, 0.5);
  noiseOffset = random(1000);
}

// Resizing the canvas depending on the size of the browser window
function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
}

// Generates a sphere-mesh using vertices and triangle indices
function buildOrb() {
  vertices = [];
  indices = [];

  for (let lattitude = 0; lattitude <= orbX; lattitude++) {
    let angleA = map(lattitude, 0, orbX, 0, PI);
    for (let longitude = 0; longitude <= orbY; longitude++) {
      let angleB = map(longitude, 0, orbY, 0, TWO_PI);

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

// Inspiration from this code: https://editor.p5js.org/ErikBorge/sketches/mjsEZbDYI
function draw() {
  background(10, 15, 20);
  noStroke();

  // Mic-driven warping
  if (audioOn && meter && millis() - _lastAudioUpdate > _audioUpdateMs) {
    _lastAudioUpdate = millis();
    let lvl = meter.getValue();
    lvl = constrain(lvl, 0, 1);
    audioLevel = lerp(audioLevel, lvl, 0.25);
  }

  // Map level to orb parameters
  const _warpStrength = _baseNoiseStrength + audioLevel * 110; // higher = more
  const _radiusBoost = audioLevel * 35; // slight puffing
  const _speedBoost = audioLevel * 0.9; // faster surface motion
  const _rotBoost = audioLevel * 0.02; // a bit more spin

  noiseStrength = _warpStrength;
  radius = _baseRadius + _radiusBoost;
  noiseSpeed = _baseNoiseSpeed + _speedBoost;
  noiseRotation = _baseNoiseRotation + _rotBoost;

  // Floating effect
  let floatY = sin(millis() * 0.002) * 10; // 10 pixels = speed
  translate(0, floatY, cameraDistance);

  // Automatic rotation of the orb
  rotateY((rotationY += noiseRotation));
  rotateX(rotationX);

  fill(currentColor);

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
      vertex(v.x * r, v.y * r, v.z * r);
    }
  }
  endShape();
}

// Change the color of the orb on mouse click
function mousePressed() {
  currentColorIndex = (currentColorIndex + 1) % colors.length;
  currentColor = colors[currentColorIndex];

  // Start microphone
  if (!audioOn && typeof Tone !== "undefined") {
    Tone.start()
      .then(() => {
        mic = new Tone.UserMedia();
        return mic.open();
      })
      .then(() => {
        meter = new Tone.Meter({
          channels: 1,
          normalRange: true,
          smoothing: 0.8,
        });
        mic.connect(meter);
        audioOn = true;
        console.log("Microphone started");
      })
      .catch((e) => {
        console.error("Could not start microphone:", e);
      });
  }
}
