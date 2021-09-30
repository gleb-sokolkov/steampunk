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

const quadUniform = {
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

const width = window.innerWidth;
const height = window.innerHeight;
const scene = new THREE.Scene();
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

window.addEventListener('resize', () => {
  [camera.left, camera.right, camera.top, camera.bottom] = getFullScreenCorners();
  camera.updateMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  quadUniform.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
});
window.addEventListener('scroll', () => {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  quadUniform.scrollY.value = val;
});

window.dispatchEvent(new Event('resize'));
window.dispatchEvent(new Event('scroll'));

const fullQuad = new THREE.PlaneGeometry(width, height);
const quadMaterial = new THREE.ShaderMaterial({
  uniforms: quadUniform,
  vertexShader: vertex,
  fragmentShader: fragment,
});
const quad = new THREE.Mesh(fullQuad, quadMaterial);
quad.position.z = -1;
scene.add(quad);

const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  quadUniform.time.value = clock.getElapsedTime();
}());
