/* eslint-disable space-infix-ops */
/* eslint-disable no-mixed-operators */
/* eslint-disable import/no-unresolved */
/* eslint-disable global-require */
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import {
  Clock, FloatType, GLSL3, Mesh, NearestFilter, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, RepeatWrapping, RGBAFormat, Scene, ShaderMaterial, Sprite, SpriteMaterial,
  TextureLoader, Vector2, Vector3, WebGLMultipleRenderTargets, WebGLRenderer,
  InstancedBufferGeometry, InstancedBufferAttribute, BufferAttribute, InstancedMesh, BoxGeometry,
  RawShaderMaterial, BufferGeometry, MeshBasicMaterial, ClampToEdgeWrapping, Group,
} from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';
import {
  EffectComposer, RenderPass, EffectPass, DepthOfFieldEffect, ShaderPass,
} from 'postprocessing';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
// shaders
import * as noiseBG from './shaders/noiseBG';
import * as rain from './shaders/rain';
import * as shade from './shaders/shade';
import airships from './shaders/airships';
import film from './shaders/film';
import fog from './shaders/fog';

import airship1Texture from '../images/airship1_.png';
import ballons1Texture from '../images/ballons1_.png';
import ballons3Texture from '../images/ballons3_.png';
import fogTexture from '../images/fog_.png';
import cargoCraneTexture from '../images/cargo_crane_.png';

// --------------------------------------------------------------------------------- Constants
const clock = new Clock();
const loader = new TextureLoader();
const planes = new Vector2(0.1, 1000);
const fov = 75;
const cameraMaxScrollY = -1000;
const dofProps = {
  focusDistance: 0.3,
  focalLength: 0.05,
  bokehScale: {
    d: 2.5,
    min: 0.0,
    max: 5.0,
  },
};
const filmProps = {
  nIntensity: {
    d: 0.05,
    min: 0.0,
    max: 1.0,
  },
  sIntensity: {
    d: 0.0,
    min: 0.0,
    max: 1.0,
  },
  sCount: {
    d: 500,
    min: 0,
    max: 1000,
  },
};

const airshipOptions = {
  count: 10,
  nearOffset: 100,
  farOffset: 700,
  offsetMult: new Vector2(1.0, 2.0),
  speedRange: new Vector2(10.0, 75.0),
  size: 20.0,
};
// --------------------------------------------------------------------------------- Constants

// --------------------------------------------------------------------------------- Uniforms
const updatableU = {
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

const defaultU = {
  time: updatableU.time,
  resolution: updatableU.resolution,
  scrollY: updatableU.scrollY,
};
// --------------------------------------------------------------------------------- Uniforms

let preScene; let postScene;
let bg_camera; let main_camera;
let renderTarget; let renderer; let composer;
let noiseQuad; let finalQuad;

// --------------------------------------------------------------------------------- Utils
function getFullScreenCorners() {
  return [
    -window.innerWidth * 0.5,
    window.innerWidth * 0.5,
    window.innerHeight * 0.5,
    -window.innerHeight * 0.5,
  ];
}

function getVisiblePlane(z) {
  const h = z * Math.tan(main_camera.fov * 0.5 * Math.PI / 180);
  const w = h * main_camera.aspect;
  return { w, h };
}

function getRandomRange(vec) {
  return Math.random() * (vec.y - vec.x) + vec.x;
}

async function imageSizeSprite(path, pivot = new Vector2(0.0, 0.0)) {
  // eslint-disable-next-line no-use-before-define
  const texture = await setupTexture(path, ClampToEdgeWrapping, ClampToEdgeWrapping, true);
  const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
  geometry.translate(pivot.x * texture.image.width, pivot.y * texture.image.height, 0);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
  });
  const sprite = new Mesh(geometry, material);
  return sprite;
}
// --------------------------------------------------------------------------------- Utils

function onWindowResize() {
  [
    bg_camera.left,
    bg_camera.right,
    bg_camera.top,
    bg_camera.bottom,
  ] = getFullScreenCorners();
  bg_camera.updateProjectionMatrix();

  main_camera.aspect = window.innerWidth / window.innerHeight;
  main_camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(
    window.innerWidth,
    window.innerHeight,
  );

  composer.setSize(window.innerWidth, window.innerHeight);

  updatableU.resolution.value = new Vector2(window.innerWidth, window.innerHeight);

  noiseQuad.scale.set(window.innerWidth, window.innerHeight);
  finalQuad.scale.set(window.innerWidth, window.innerHeight);
}

function onWindowScroll() {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  updatableU.scrollY.value = val;
  main_camera.position.y = val * cameraMaxScrollY;
}

async function setupTexture(
  path, wrapS, wrapT,
  flipY = false,
  minFilter = NearestFilter,
  magFilter = NearestFilter,
) {
  const texture = await loader.loadAsync(path);
  [texture.wrapS, texture.wrapT] = [wrapS, wrapT];
  [texture.minFilter, texture.magFilter] = [minFilter, magFilter];
  texture.flipY = flipY;
  return texture;
}

function quadGeometry() {
  const geometry = new InstancedBufferGeometry();

  const positions = new BufferAttribute(new Float32Array(4 * 3), 3);
  positions.setXYZ(0, -0.5, 0.5, 0.0);
  positions.setXYZ(1, 0.5, 0.5, 0.0);
  positions.setXYZ(2, -0.5, -0.5, 0.0);
  positions.setXYZ(3, 0.5, -0.5, 0.0);
  geometry.setAttribute('position', positions);

  const uvs = new BufferAttribute(new Float32Array(4 * 2), 2);
  uvs.setXY(0, 0.0, 0.0);
  uvs.setXY(1, 1.0, 0.0);
  uvs.setXY(2, 0.0, 1.0);
  uvs.setXY(3, 1.0, 1.0);
  geometry.setAttribute('uv', uvs);

  geometry.setIndex(new BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));

  return geometry;
}

async function fogParticles(texturePath) {
  const geometry = quadGeometry();
  const count = 10;
  const angleRange = new Vector2(-Math.PI * 0.05, Math.PI * 0.05);
  const speedRange = new Vector2(4.0, 8.0);
  const aSpeedRange = new Vector2(0.0, 0.5);
  const texture = await setupTexture(texturePath, ClampToEdgeWrapping, ClampToEdgeWrapping);
  const texAspect = texture.image.width / texture.image.height;
  const scaleRange = new Vector2(1.0, 5.0);
  // x - angle, y - velocity, z - angular velocity w - life time
  const movement = new InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const scale = new InstancedBufferAttribute(new Float32Array(count * 2), 2);
  for (let i = 0; i < count; i++) {
    const dir = Math.sign(Math.random() - 0.5);
    movement.array[i * 3 + 0] = getRandomRange(angleRange);
    movement.array[i * 3 + 1] = getRandomRange(speedRange);
    movement.array[i * 3 + 2] = getRandomRange(aSpeedRange) * dir;

    const randomScale = getRandomRange(scaleRange);
    scale.array[i * 2 + 0] = randomScale * texAspect;
    scale.array[i * 2 + 1] = randomScale;
  }

  geometry.setAttribute('movement', movement);
  geometry.setAttribute('scale', scale);
  const material = new ShaderMaterial({
    uniforms: {
      ...fog.uniforms,
      ...updatableU,
      dif: { value: texture },
    },
    vertexShader: fog.vertexShader,
    fragmentShader: fog.fragmentShader,
    transparent: true,
    depthTest: true,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  return mesh;
}

async function airshipParticles(texturePath, options = airshipOptions) {
  const geometry = quadGeometry();
  const {
    count, nearOffset, farOffset, offsetMult, speedRange, size,
  } = options;
  const texture = await setupTexture(texturePath, RepeatWrapping, RepeatWrapping);
  const imgAspect = texture.image.width / texture.image.height;

  const scale = Array(4).fill(null).reduce((acc) => {
    acc.push(size * imgAspect, size);
    return acc;
  }, []);
  geometry.setAttribute('scale', new BufferAttribute(new Float32Array(scale), 2));

  const offsetWithVel = new InstancedBufferAttribute(new Float32Array(count * 4), 4, false);
  for (let i = 0; i < count; i++) {
    const randomVector = new Vector3();
    randomVector.z = Math.random() * (planes.y - nearOffset - farOffset);
    const zPlane = getVisiblePlane(nearOffset + randomVector.z);
    zPlane.w *= 2.0;
    zPlane.h *= 2.0;
    randomVector.x = (Math.random() - 0.5) * zPlane.w * offsetMult.x;
    randomVector.y = (Math.random() - 0.5) * zPlane.h * offsetMult.y;

    const direction = Math.sign(Math.random() - 0.5);
    const velocity = getRandomRange(speedRange);
    randomVector.x += zPlane.w * 1.5 * direction;

    offsetWithVel.array[i * 4 + 0] = randomVector.x;
    offsetWithVel.array[i * 4 + 1] = randomVector.y;
    offsetWithVel.array[i * 4 + 2] = -randomVector.z - nearOffset;
    offsetWithVel.array[i * 4 + 3] = velocity;
  }

  geometry.setAttribute('offsetVel', offsetWithVel);
  const material = new ShaderMaterial({
    uniforms: {
      ...airships.uniforms,
      ...updatableU,
      tex: { value: texture },
    },
    vertexShader: airships.vertexShader,
    fragmentShader: airships.fragmentShader,
    transparent: true,
    depthTest: true,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  return mesh;
}

function animate() {
  renderer.setRenderTarget(renderTarget);
  renderer.render(preScene, bg_camera);
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

  renderer = new WebGLRenderer({
    canvas: document.getElementById('noiseBG'),
    antialias: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);

  renderTarget = new WebGLMultipleRenderTargets(
    window.innerWidth,
    window.innerHeight,
    1,
  );

  for (let i = 0; i < renderTarget.texture.length; i++) {
    renderTarget.texture[i].minFilter = NearestFilter;
    renderTarget.texture[i].magFilter = NearestFilter;
    if (renderer.extensions.has('EXT_color_buffer_float')) {
      renderTarget.texture[i].internalFormat = 'RGBA16F';
    }
    renderTarget.texture[i].format = RGBAFormat;
    renderTarget.texture[i].type = FloatType;
  }
  renderTarget.texture[0].name = 'noise';

  preScene = new Scene();
  bg_camera = new OrthographicCamera(
    ...getFullScreenCorners(),
    ...planes.toArray(),
  );

  main_camera = new PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    ...planes.toArray(),
  );

  // --------------------------------------------------------------------------------- Pre render
  const noiseQuadMaterial = new ShaderMaterial({
    uniforms: defaultU,
    vertexShader: noiseBG.vertex,
    fragmentShader: noiseBG.fragment,
    glslVersion: GLSL3,
  });
  noiseQuad = new Mesh(new PlaneGeometry(1, 1), noiseQuadMaterial);
  noiseQuad.position.z = -2;
  preScene.add(noiseQuad);
  // --------------------------------------------------------------------------------- Pre render

  // --------------------------------------------------------------------------------- Post render
  postScene = new Scene();
  const finalQuadMaterial = new ShaderMaterial({
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
    glslVersion: GLSL3,
  });

  const plane = getVisiblePlane(planes.y);

  finalQuad = new Mesh(new PlaneGeometry(plane.w, plane.h), finalQuadMaterial);
  finalQuad.position.z = -planes.y;

  const shipGroup = new Group();
  shipGroup.position.y = cameraMaxScrollY * 0.2;
  const shipMesh1 = await airshipParticles(airship1Texture, {
    count: 3,
    farOffset: 0,
    nearOffset: 500,
    offsetMult: new Vector2(1.0, 1.0),
    size: 300,
    speedRange: new Vector2(25.0, 50.0),
  });
  const shipMesh2 = await airshipParticles(ballons3Texture, {
    count: 10,
    farOffset: 0,
    nearOffset: 200,
    offsetMult: new Vector2(1.0, 1.0),
    size: 100,
    speedRange: new Vector2(10.0, 30.0),
  });
  const shipMesh3 = await airshipParticles(ballons1Texture, {
    count: 10,
    farOffset: 600,
    nearOffset: 100,
    offsetMult: new Vector2(1.0, 1.0),
    size: 50,
    speedRange: new Vector2(10.0, 20.0),
  });
  shipGroup.add(shipMesh1, shipMesh2, shipMesh3);
  // const fogMesh = await fogParticles(fogTexture);
  // fogMesh.position.z = -50;
  // fogMesh.position.y = -100;
  // postScene.add(shipMesh, fogMesh);

  const bottomSprites = new Group();
  bottomSprites.position.y = cameraMaxScrollY;

  const ccDepth = 500;
  const ccPlane = getVisiblePlane(ccDepth);
  const cargoCrane = await imageSizeSprite(cargoCraneTexture, new Vector2(-0.5, 0.5));
  cargoCrane.position.x = ccPlane.w;
  cargoCrane.position.y = -ccPlane.h;
  cargoCrane.position.z = -ccDepth;

  bottomSprites.add(cargoCrane);

  postScene.add(finalQuad, bottomSprites, shipGroup);
  // --------------------------------------------------------------------------------- Post render

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(postScene, main_camera);

  const dofEffect = new DepthOfFieldEffect(main_camera, {
    focusDistance: dofProps.focusDistance,
    focalLength: dofProps.focalLength,
    bokehScale: dofProps.bokehScale.d,
  });

  const effectPass = new EffectPass(main_camera, dofEffect);
  const filmShader = new ShaderMaterial({
    uniforms: {
      ...film.uniforms,
      ...updatableU,
      nIntensity: { value: 0.05 },
      sIntensity: { value: 0.0 },
      grayscale: { value: false },
    },
    fragmentShader: film.fragmentShader,
    vertexShader: film.vertexShader,
  });
  const filmPass = new ShaderPass(filmShader, 'tDiffuse');

  composer.addPass(renderPass);
  composer.addPass(effectPass);
  composer.addPass(filmPass);

  // why it isn't possible to do in the constructor?
  // shadePass.uniforms.shadetex.value = await setupTexture(
  //   shadeTexture,
  //   THREE.RepeatWrapping,
  //   THREE.ClampToEdgeWrapping,
  //   THREE.LinearFilter,
  //   THREE.LinearFilter,
  // );
  // Use this to setup shader's uniforms
  // ShaderPass.uniforms;

  // --------------------------------------------------------------------------------- Window events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onWindowScroll);

  window.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new Event('scroll'));
  // --------------------------------------------------------------------------------- Window events

  // --------------------------------------------------------------------------------- GUI
  const gui = new GUI();

  const filmFolder = gui.addFolder('FilmPass');
  filmFolder.add(filmShader.uniforms.grayscale, 'value').name('grayscale');
  filmFolder.add(filmShader.uniforms.nIntensity, 'value', filmProps.nIntensity.min, filmProps.nIntensity.max).name('noise intensity');
  filmFolder.add(filmShader.uniforms.sIntensity, 'value', filmProps.sIntensity.min, filmProps.sIntensity.max).name('scanline intensity');
  filmFolder.add(filmShader.uniforms.sCount, 'value', filmProps.sCount.min, filmProps.sCount.max).name('scanline count');

  const dofFolder = gui.addFolder('DOFPass');
  dofFolder.add(dofEffect, 'bokehScale', dofProps.bokehScale.min, dofProps.bokehScale.max);
  // --------------------------------------------------------------------------------- GUI

  animate();
}

init();
