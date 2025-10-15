/*
Drawing an animated orb  using noise and triangles...
-----------------------------------------------------------
The sketch draws a orb with a surface that deforms using
Perlin noise, which creates an organic and "wobbly" effect.
The orb rotates on the Y-axis, and the vertices are
displaced over time
*/

// Background shooting stars (gravitational background)
let stars = [];
let starCount = 80;
let gravityStrength = 10000; // affects curvature strength
let starSpeedMin = 1.2;
let starSpeedMax = 3.5;

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

// Creation of shooting star class
class ShootingStar {
  constructor() {
    this.reset();
  }

  reset() {
    // spawn along screen edges
    let side = floor(random(4));
    let x, y;
    if (side === 0) { x = random(width); y = -20; } // top
    else if (side === 1) { x = width + 20; y = random(height); } // right
    else if (side === 2) { x = random(width); y = height + 20; } // bottom
    else { x = -20; y = random(height); } // left

    this.pos = createVector(x, y);

    // random direction toward center-ish
    let dir = p5.Vector.sub(createVector(width / 2, height / 2), this.pos);
    dir.rotate(random(-PI / 3, PI / 3));
    dir.setMag(random(starSpeedMin, starSpeedMax));
    this.vel = dir;
    this.prevPos = this.pos.copy();

    // Shooting star color matches the orb color
    this.color = color(
      currentColor[0],
      currentColor[1],
      currentColor[2],
      random(150, 220)
    );

    this.life = random(250, 500);
  }

  update() {
    this.prevPos = this.pos.copy();

    //Gravity towards the orb affecting the particles
    let orbScreen = createVector(width / 2, height / 2);
    let dir = p5.Vector.sub(orbScreen, this.pos);
    let d = dir.mag();
    if (d < 300) { // influence range
      dir.normalize();
      let forceMag = gravityStrength / (d * d + 1000);
      let pull = dir.mult(forceMag);
      this.vel.add(pull);
      this.vel.limit(4); // prevent extreme bending
    }

    this.pos.add(this.vel);
    this.life--;

    // reset if offscreen or expired
    if (
      this.pos.x < -100 || this.pos.x > width + 100 ||
      this.pos.y < -100 || this.pos.y > height + 100 ||
      this.life <= 0
    ) {
      this.reset();
    }
  }

  draw(gfx) {
    gfx.stroke(this.color);
    gfx.strokeWeight(1.8);
    gfx.line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);
  }
}

function setup() {
  createCanvas(innerWidth, innerHeight, WEBGL); // 3D Graphics
  buildOrb();
  noiseDetail(4, 0.5);
  noiseOffset = random(1000);

  // Create 2D layer for background shooting stars
  backGroundLayer = createGraphics(innerWidth, innerHeight);
  for (let i = 0; i < starCount; i++) stars.push(new ShootingStar());
}

// Resizing the canvas depending on the size of the browser window
function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
  backGroundLayer.resizeCanvas(innerWidth, innerHeight);
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
  // Draw the shooting star background
  backGroundLayer.background(10, 15, 20, 80);
  for (let s of stars) {
    s.update();
    s.draw(backGroundLayer);
  }

  // Render background layer behind the orb
  push();
  translate(0, 0, -500);
  texture(backGroundLayer);
  noStroke();
  plane(width * 2, height * 2);
  pop();

  // Draw orb
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

  // Update star colors to match orb
  for (let s of stars) {
    s.color = color(
      currentColor[0],
      currentColor[1],
      currentColor[2],
      random(150, 220)
    );
  }

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
