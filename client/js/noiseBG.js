/* eslint-disable import/no-unresolved */
/* eslint-disable global-require */
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
// shaders
import * as noiseBG from './shaders/noiseBG';
import * as rain from './shaders/rain';
import * as shade from './shaders/shade';

import shadeTexture from '../images/test.jpg';

const clock = new THREE.Clock();

// --------------------------------------------------------------------------------- Uniforms
const updatableU = {
  time: {
    type: 'f',
    value: 0,
  },
  resolution: {
    type: 'f',
    value: null,
  },
  scrollY: {
    type: 'f',
    value: 0,
  },
};

const defaultU = {
  time: updatableU.time,
  resolution: updatableU.resolution,
  scrollY: updatableU.scrollY,
};
// --------------------------------------------------------------------------------- Uniforms

let preScene; let postScene;
let camera;
let renderTarget; let renderer; let composer;
let noiseQuad; let finalQuad;

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
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(
    window.innerWidth,
    window.innerHeight,
  );

  composer.setSize(window.innerWidth, window.innerHeight);

  updatableU.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);

  noiseQuad.scale.set(window.innerWidth, window.innerHeight);
  finalQuad.scale.set(window.innerWidth, window.innerHeight);
}

function onWindowScroll() {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  updatableU.scrollY.value = val;
}

async function setupTexture(path, wrapS, wrapT) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(path);
  [texture.wrapS, texture.wrapT] = [wrapS, wrapT];
  return texture;
}

function animate() {
  renderer.setRenderTarget(renderTarget);
  renderer.render(preScene, camera);
  renderer.setRenderTarget(null);
  composer.render();

  updatableU.time.value = clock.getElapsedTime();

  requestAnimationFrame(animate);
}

async function init() {
  if (WEBGL.isWebGL2Available === false) {
    document.body.insertBefore(WEBGL.getWebGL2ErrorMessage(), document.body.firstChild);
    return;
  }

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('noiseBG'),
    antialias: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderTarget = new THREE.WebGLMultipleRenderTargets(
    window.innerWidth,
    window.innerHeight,
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
  const textureLoader = new THREE.TextureLoader();

  // --------------------------------------------------------------------------------- Pre render
  const noiseQuadMaterial = new THREE.ShaderMaterial({
    uniforms: defaultU,
    vertexShader: noiseBG.vertex,
    fragmentShader: noiseBG.fragment,
    glslVersion: THREE.GLSL3,
  });
  noiseQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), noiseQuadMaterial);
  noiseQuad.position.z = -2;
  preScene.add(noiseQuad);
  // --------------------------------------------------------------------------------- Pre render

  // --------------------------------------------------------------------------------- Post render
  postScene = new THREE.Scene();
  const finalQuadMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: updatableU.time,
      resolution: updatableU.resolution,
      scrollY: updatableU.scrollY,
      noise: {
        value: renderTarget.texture[0],
      },
    },
    vertexShader: rain.vertex,
    fragmentShader: rain.fragment,
    glslVersion: THREE.GLSL3,
  });
  finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), finalQuadMaterial);
  finalQuad.position.z = -1;
  postScene.add(finalQuad);
  // --------------------------------------------------------------------------------- Post render

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(postScene, camera);
  const shadePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      shadetex: {
        type: 't',
        value: null,
      },
      scrollY: null,
    },
    vertexShader: shade.vertex,
    fragmentShader: shade.fragment,
    glslVersion: THREE.GLSL3,
  });
  const filmPass = new FilmPass(
    0.05,
    0.0,
    1000,
    false,
  );
  filmPass.renderToScreen = true;
  composer.addPass(renderPass);
  composer.addPass(shadePass);
  composer.addPass(filmPass);

  // why it isn't possible to do in the constructor?
  shadePass.uniforms.shadetex.value = await setupTexture(
    shadeTexture,
    THREE.RepeatWrapping,
    THREE.ClampToEdgeWrapping,
  );
  // Here it's same
  shadePass.uniforms.scrollY = updatableU.scrollY;

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
