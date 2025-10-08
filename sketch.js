/*
Drawing an animated orb  using noise and triangles...
-----------------------------------------------------------
The sketch draws a orb witha surface that deforms using
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
let noiseRotation = 0.002;

let rotationX = -0.4;
let rotationY = 0.4;
let cameraDistance = 100;

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

function draw() {
  background(10, 15, 20);
  noStroke();
  translate(0, 0, cameraDistance);

  // Automatic rotation of the orb
  rotateY((rotationY += noiseRotation));
  rotateX(rotationX);

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

const selectedElement = document.getElementById("selected");
const sineButton = document.getElementById("sine");
const squareButton = document.getElementById("square");
const sawButton = document.getElementById("sawtooth");
const triangleButton = document.getElementById("triangle");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const slider = document.getElementById("frequency");
let oscillator;

window.addEventListener("load", () => {
  oscillator = new Tone.Oscillator(440, "sine").toDestination();
oscillator.frequency.value = slider.value;
});

sineButton.addEventListener("click", () => {
  oscillator.type = "sine";
  selectedElement.innerText = "Selected: Sine";
});

squareButton.addEventListener("click", () => {
  oscillator.type = "square";
  selectedElement.innerText = "Selected: Square";
});

sawButton.addEventListener("click", () => {
  oscillator.type = "sawtooth";
  selectedElement.innerText = "Selected: SawTooth";
});

triangleButton.addEventListener("click", () => {
  oscillator.type = "triangle";
  selectedElement.innerText = "Selected: Triangle";
});

slider.addEventListener("input", () => {
  oscillator.frequency.value = slider.value;
});

startButton.addEventListener("click", () => {
  oscillator.start();
});

stopButton.addEventListener("click", () => {
  oscillator.stop();
});

window.addEventListener("click", () => {
  Tone.start();
});
