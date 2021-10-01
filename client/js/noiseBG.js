/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { fragment, vertex } from './shaders/noiseBG';

function getFullScreenCorners() {
  return [
    -window.innerWidth * 0.5,
    window.innerWidth * 0.5,
    window.innerHeight * 0.5,
    -window.innerHeight * 0.5,
  ];
}

const width = window.innerWidth;
const height = window.innerHeight;
const scene = new THREE.Scene();
const clock = new THREE.Clock();

const noiseU = {
  time: {
    type: 'f',
    value: 0,
  },
  resolution: {
    type: 'v2',
    value: null,
  },
  scrollY: {
    type: 'f',
    value: 0,
  },
};

scene.background = new THREE.Color(0xffffff);

const camera = new THREE.OrthographicCamera(
  ...getFullScreenCorners(),
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('noiseBG'),
  antialias: true,
});

// --------------------------------------------------------------------------------- Window events
window.addEventListener('resize', () => {
  [camera.left, camera.right, camera.top, camera.bottom] = getFullScreenCorners();
  camera.updateMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  noiseU.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
});
window.addEventListener('scroll', () => {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  noiseU.scrollY.value = val;
});
// --------------------------------------------------------------------------------- Window events

window.dispatchEvent(new Event('resize'));
window.dispatchEvent(new Event('scroll'));

const noiseQuad = new THREE.PlaneGeometry(width, height);
const quadMaterial = new THREE.ShaderMaterial({
  uniforms: noiseU,
  vertexShader: vertex,
  fragmentShader: fragment,
});
const quad = new THREE.Mesh(noiseQuad, quadMaterial);
quad.position.z = -1;
scene.add(quad);

(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  noiseU.time.value = clock.getElapsedTime();
}());
