/*
Animated orb reacting to sound, with gravitational "shooting stars" background.
-----------------------------------------------------------
The orb surface deforms using Perlin noise, while a background
of subtle shooting stars drifts behind it. Stars slightly curve
their path when passing near the orb, simulating weak gravity.
*/

// === Shooting star background variables ===
let stars = [];
let starCount = 80;
let gravityStrength = 10000; // affects curvature strength
let starSpeedMin = 1.2;
let starSpeedMax = 3.5;

// === Orb geometry ===
let orbX = 40;
let orbY = 60;
let radius = 160;
let vertices = [];
let indices = [];

// === Noise deformation ===
let noiseOffset = 0;
let noiseScale = 0.9;
let noiseStrength = 40;
let noiseSpeed = 0.5;
let noiseRotation = 0.002;

let rotationX = -0.4;
let rotationY = 0.4;
let cameraDistance = 100;

// === Colors ===
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

// === Audio ===
let audioOn = false;
let mic, meter;
let audioLevel = 0;
let _lastAudioUpdate = 0;
const _audioUpdateMs = 33;
const _baseNoiseStrength = noiseStrength;
const _baseRadius = radius;
const _baseNoiseSpeed = noiseSpeed;
const _baseNoiseRotation = noiseRotation;

// === Shooting star class ===
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
    this.color = color(
      random(180, 255),
      random(180, 255),
      random(200, 255),
      random(120, 200)
    );
    this.life = random(250, 500);
  }

  update() {
    this.prevPos = this.pos.copy();

    // --- gravitational attraction to orb ---
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

// === Setup ===
function setup() {
  createCanvas(innerWidth, innerHeight, WEBGL);
  buildOrb();
  noiseDetail(4, 0.5);
  noiseOffset = random(1000);

  // 2D background layer for stars
  bgLayer = createGraphics(innerWidth, innerHeight);
  for (let i = 0; i < starCount; i++) stars.push(new ShootingStar());
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
  bgLayer.resizeCanvas(innerWidth, innerHeight);
}

// === Orb mesh ===
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

// === Draw background stars ===
function drawBackgroundStars() {
  bgLayer.background(10, 15, 20, 80); // semi-transparent fade

  for (let s of stars) {
    s.update();
    s.draw(bgLayer);
  }
}

// === Draw loop ===
function draw() {
  // --- draw star field first ---
  drawBackgroundStars();

  push();
  translate(0, 0, -500);
  texture(bgLayer);
  noStroke();
  plane(width * 2, height * 2);
  pop();

  // --- draw orb ---
  noStroke();

  if (audioOn && meter && millis() - _lastAudioUpdate > _audioUpdateMs) {
    _lastAudioUpdate = millis();
    let lvl = meter.getValue();
    lvl = constrain(lvl, 0, 1);
    audioLevel = lerp(audioLevel, lvl, 0.25);
  }

  const _warpStrength = _baseNoiseStrength + audioLevel * 110;
  const _radiusBoost = audioLevel * 35;
  const _speedBoost = audioLevel * 0.9;
  const _rotBoost = audioLevel * 0.02;

  noiseStrength = _warpStrength;
  radius = _baseRadius + _radiusBoost;
  noiseSpeed = _baseNoiseSpeed + _speedBoost;
  noiseRotation = _baseNoiseRotation + _rotBoost;

  let floatY = sin(millis() * 0.002) * 10;
  translate(0, floatY, cameraDistance);

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

// === Color change + mic start ===
function mousePressed() {
  currentColorIndex = (currentColorIndex + 1) % colors.length;
  currentColor = colors[currentColorIndex];

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
      .catch((e) => console.error("Could not start microphone:", e));
  }
}
