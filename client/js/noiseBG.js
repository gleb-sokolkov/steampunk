/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
// shaders
import * as noiseBG from './shaders/noiseBG';
import * as rain from './shaders/rain';
import * as shade from './shaders/shade';

const clock = new THREE.Clock();
let preScene; let postScene;
let camera;
let renderTarget; let renderer; let composer;

const defaultU = {
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

function getFullScreenCorners() {
  return [
    -window.innerWidth * 0.5,
    window.innerWidth * 0.5,
    window.innerHeight * 0.5,
    -window.innerHeight * 0.5,
  ];
}

function onWindowResize() {
  [camera.left, camera.right, camera.top, camera.bottom] = getFullScreenCorners();
  camera.updateMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderTarget.setSize(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio(),
  );
  composer.setSize(window.innerWidth, window.innerHeight);
  defaultU.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
}

function onWindowScroll() {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  defaultU.scrollY.value = val;
}

function animate() {
  renderer.setRenderTarget(renderTarget);
  renderer.render(preScene, camera);
  renderer.setRenderTarget(null);
  composer.render();
  defaultU.time.value = clock.getElapsedTime();

  requestAnimationFrame(animate);
}

function init() {
  if (WEBGL.isWebGL2Available === false) {
    document.body.insertBefore(WEBGL.getWebGL2ErrorMessage(), document.body.firstChild);
    return;
  }

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('noiseBG'),
    antialias: true,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderTarget = new THREE.WebGLMultipleRenderTargets(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio(),
    1,
  );

  for (let i = 0; i < renderTarget.texture.length; i++) {
    renderTarget.texture[i].minFilter = THREE.NearestFilter;
    renderTarget.texture[i].magFilter = THREE.NearestFilter;
    if (renderer.extensions.has('EXT_color_buffer_float')) {
      renderTarget.texture[i].internalFormat = 'RGBA16F';
    }
    renderTarget.texture[i].format = THREE.RGBAFormat;
    renderTarget.texture[i].type = THREE.FloatType;
  }
  renderTarget.texture[0].name = 'noise';

  preScene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(
    ...getFullScreenCorners(),
    0.1,
    1000,
  );

  // --------------------------------------------------------------------------------- Pre render
  const noiseQuadGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
  const noiseQuadMaterial = new THREE.ShaderMaterial({
    uniforms: defaultU,
    vertexShader: noiseBG.vertex,
    fragmentShader: noiseBG.fragment,
    glslVersion: THREE.GLSL3,
  });
  const noiseQuad = new THREE.Mesh(noiseQuadGeometry, noiseQuadMaterial);
  noiseQuad.position.z = -1;
  preScene.add(noiseQuad);
  // --------------------------------------------------------------------------------- Pre render

  // --------------------------------------------------------------------------------- Post render
  const targetU = Object.assign(defaultU, {
    noise: {
      value: renderTarget.texture[0],
    },
  });
  postScene = new THREE.Scene();
  const finalQuadGeometry = noiseQuadGeometry.clone();
  const finalQuadMaterial = new THREE.ShaderMaterial({
    uniforms: targetU,
    vertexShader: rain.vertex,
    fragmentShader: rain.fragment,
    glslVersion: THREE.GLSL3,
  });
  const finalQuad = new THREE.Mesh(finalQuadGeometry, finalQuadMaterial);
  finalQuad.position.z = -2;

  const shadeGeometry = noiseQuadGeometry.clone();
  const shadeMaterial = new THREE.ShaderMaterial({
    uniforms: targetU,
    vertexShader: shade.vertex,
    fragmentShader: shade.fragment,
    glslVersion: THREE.GLSL3,
    transparent: true,
  });
  const shadeMesh = new THREE.Mesh(shadeGeometry, shadeMaterial);
  shadeMesh.position.z = -1;
  postScene.add(finalQuad, shadeMesh);
  // --------------------------------------------------------------------------------- Post render

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(postScene, camera);
  // renderPass.renderToScreen = true;

  const filmPass = new FilmPass(
    0.05,
    0.0,
    1000,
    false,
  );
  filmPass.renderToScreen = true;
  composer.addPass(renderPass);
  composer.addPass(filmPass);

  // --------------------------------------------------------------------------------- Window events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onWindowScroll);

  window.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new Event('scroll'));
  // --------------------------------------------------------------------------------- Window events

  // --------------------------------------------------------------------------------- GUI
  const gui = new GUI();
  const folder = gui.addFolder('FilmPass');
  folder.add(filmPass.uniforms.grayscale, 'value').name('grayscale');
  folder.add(filmPass.uniforms.nIntensity, 'value', 0, 1).name('noise intensity');
  folder.add(filmPass.uniforms.sIntensity, 'value', 0, 1).name('scanline intensity');
  folder.add(filmPass.uniforms.sCount, 'value', 0, 1000).name('scanline count');
  // --------------------------------------------------------------------------------- GUI

  animate();
}

init();
