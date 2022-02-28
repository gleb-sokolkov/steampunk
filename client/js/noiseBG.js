import {
  FloatType, GLSL3, Mesh, NearestFilter, PerspectiveCamera,
  PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector2,
  WebGLMultipleRenderTargets, WebGLRenderer, Group,
  DepthTexture, DepthFormat, UnsignedShortType,
} from 'three';
import WebGL from 'three/examples/jsm/capabilities/WebGL';
import {
  EffectComposer, EffectPass, DepthOfFieldEffect, SMAAEffect,
  KernelSize, BloomEffect,
} from 'postprocessing';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { FilmEffect, BGEffect } from './effects';
import {
  getVisiblePlane,
} from './utils';
import {
  clock, planes, fov, cameraMaxScrollY, scrollSpeed,
  dofProps, filmProps, updatableU, shaders,
} from './constants';
import { HTMLCreator } from './html/htmlFactory';

// --------------------------------------------------------------------------------- Render elements
const htmlCreator = new HTMLCreator();
const preScene = new Scene();
const main_camera = new PerspectiveCamera(
  fov,
  window.innerWidth / window.innerHeight,
  ...planes.toArray(),
);
const contentGroup = new Group();
let renderTarget, noiseQuad, renderer, composer;

// --------------------------------------------------------------------------------- Render elements

function onWindowResize() {
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
}

function onWindowScroll() {
  const mh = document.body.clientHeight;
  const wh = window.innerHeight;
  const ws = window.scrollY;
  const val = ws / (mh - wh + 0.1);
  updatableU.scrollY.value = val;
  main_camera.position.y = val * cameraMaxScrollY.getValue();
}

async function genAreaSearchImages() {
  const areaImage = new Image();
  areaImage.src = SMAAEffect.areaImageDataURL;
  await new Promise((resolve, reject) => {
    areaImage.onload = () => resolve();
    areaImage.onerror = () => reject();
  });

  const searchImage = new Image();
  searchImage.src = SMAAEffect.searchImageDataURL;
  await new Promise((resolve, reject) => {
    searchImage.onload = () => resolve();
    searchImage.onerror = () => reject();
  });
  return [searchImage, areaImage];
}

function animate() {
  renderer.setRenderTarget(renderTarget);
  renderer.setClearColor(0xffffff, 1.0);
  renderer.clear();
  renderer.render(preScene, main_camera);

  renderer.setRenderTarget(null);
  composer.render();

  updatableU.time.value = clock.getElapsedTime();

  requestAnimationFrame(animate);
}

async function init() {
  if (WebGL.isWebGL2Available === false) {
    document.body.insertBefore(WebGL.getWebGL2ErrorMessage(), document.body.firstChild);
    return;
  }

  if (!document.getElementById('noiseBG')) {
    return;
  }

  renderer = new WebGLRenderer({
    canvas: document.getElementById('noiseBG'),
    antialias: false,
    preserveDrawingBuffer: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);

  renderTarget = new WebGLMultipleRenderTargets(
    window.innerWidth,
    window.innerHeight,
    3,
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

  renderTarget.depthTexture = new DepthTexture();
  renderTarget.depthTexture.format = DepthFormat;
  renderTarget.depthTexture.type = UnsignedShortType;

  renderTarget.texture[0].name = 'color';
  renderTarget.texture[1].name = 'noise';
  renderTarget.texture[2].name = 'colortex2';

  const farPlane = getVisiblePlane(planes.y, main_camera);

  const bodyHeight = (scrollSpeed.Max - scrollSpeed.D) * window.innerHeight;
  document.body.style.height = `${bodyHeight}px`;

  // --------------------------------------------------------------------------------- Pre render
  const noiseBGMaterial = new ShaderMaterial({
    uniforms: { ...shaders.noiseBG.uniforms, ...updatableU },
    vertexShader: shaders.noiseBG.vertexShader,
    fragmentShader: shaders.noiseBG.fragmentShader,
    glslVersion: GLSL3,
  });
  noiseQuad = new Mesh(new PlaneGeometry(farPlane.w, farPlane.h), noiseBGMaterial);
  noiseQuad.position.z = -planes.y;

  const toCanvas = [...document.querySelectorAll('[data-type]')];

  const htmlObjects = await Promise.all(toCanvas.map(async (i) => {
    const obj = htmlCreator.parseElement(i, i, main_camera);
    await obj.createMesh();
    obj.updateViewport(cameraMaxScrollY.getValue());
    obj.setMatrix();
    return obj;
  }));

  htmlObjects.forEach((o) => {
    contentGroup.add(o.mesh);
    cameraMaxScrollY.next(
      Math.min(
        o.mesh.position.y,
        cameraMaxScrollY.getValue(),
      ),
    );
  });

  htmlObjects.forEach((o) => {
    const y = cameraMaxScrollY.getValue();
    o.updateViewport(y);
    o.updateAnimation?.();
    o.setMatrix();
  });

  preScene.add(noiseQuad, contentGroup);
  // --------------------------------------------------------------------------------- Pre render

  // --------------------------------------------------------------------------------- Effects
  const bgEffect = new BGEffect(Object.entries({
    sceneTexture: { value: renderTarget.texture[0] },
    depthTexture: { value: renderTarget.depthTexture },
    noiseTexture: { value: renderTarget.texture[1] },
    alphaTexture: { value: renderTarget.texture[2] },
    ...updatableU,
    near: { value: planes.x },
    far: { value: planes.y },
  }));

  const dofEffect = new DepthOfFieldEffect(main_camera, {
    focusDistance: dofProps.focusDistance,
    focalLength: dofProps.focalLength,
    bokehScale: dofProps.bokehScale.d,
  });

  const filmEffect = new FilmEffect(Object.entries({
    ...updatableU,
    nIntensity: { value: filmProps.nIntensity.d },
    sIntensity: { value: filmProps.sIntensity.d },
    sCount: { value: filmProps.sCount.d },
    grayscale: { value: false },
  }));

  const smaaEffect = new SMAAEffect(...await genAreaSearchImages());

  const bloomEffect = new BloomEffect();
  // --------------------------------------------------------------------------------- Effects

  // --------------------------------------------------------------------------------- Composer
  composer = new EffectComposer(renderer, { depthBuffer: false });
  const geometry = new EffectPass(main_camera, bgEffect);
  const effectPass = new EffectPass(main_camera, smaaEffect, bloomEffect, dofEffect, filmEffect);
  effectPass.setDepthTexture(renderTarget.depthTexture);
  composer.addPass(geometry);
  composer.addPass(effectPass);
  // --------------------------------------------------------------------------------- Composer

  // --------------------------------------------------------------------------------- Window events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onWindowScroll);

  window.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new Event('scroll'));
  // --------------------------------------------------------------------------------- Window events

  // --------------------------------------------------------------------------------- GUI
  const gui = new GUI();

  const filmFolder = gui.addFolder('FilmPass');
  filmFolder.add(filmEffect.uniforms.get('grayscale'), 'value').name('grayscale');
  filmFolder.add(filmEffect.uniforms.get('nIntensity'), 'value', filmProps.nIntensity.min, filmProps.nIntensity.max).name('noise intensity');
  filmFolder.add(filmEffect.uniforms.get('sIntensity'), 'value', filmProps.sIntensity.min, filmProps.sIntensity.max).name('scanline intensity');
  filmFolder.add(filmEffect.uniforms.get('sCount'), 'value', filmProps.sCount.min, filmProps.sCount.max).name('scanline count');

  const dofFolder = gui.addFolder('DOFPass');
  dofFolder.add(dofEffect, 'bokehScale', dofProps.bokehScale.min, dofProps.bokehScale.max);

  const bloomFolder = gui.addFolder('BloomPass');
  bloomFolder.add(bloomEffect.blurPass, 'kernelSize', KernelSize).name('kernel size').setValue(KernelSize.MEDIUM);
  bloomFolder.add(bloomEffect.resolution, 'width', [240, 360, 480, 720, 1080]).name('resolution').setValue(360)
    .onChange((value) => {
      bloomEffect.resolution.width = parseInt(value);
      bloomEffect.resolution.height = parseInt(value);
    });
  bloomFolder.add(bloomEffect, 'intensity', 0, 5).name('intensity').setValue(1.7);
  // --------------------------------------------------------------------------------- GUI

  animate();
}

init();
