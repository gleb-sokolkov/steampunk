import {
  FloatType, GLSL3, Mesh, NearestFilter, PerspectiveCamera,
  PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector2,
  WebGLMultipleRenderTargets, WebGLRenderer, Group,
  DepthTexture, DepthFormat, UnsignedShortType, LinearMipmapLinearFilter,
} from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';
import {
  EffectComposer, EffectPass, DepthOfFieldEffect,
  SMAAEffect, SavePass, BlurPass, KernelSize,
} from 'postprocessing';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
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
let renderTarget, noiseQuad, renderer, composer, lightComposer;

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
  lightComposer.render();

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
  renderTarget.texture[2].generateMipmaps = true;
  renderTarget.texture[2].minFilter = LinearMipmapLinearFilter;

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
    bAlphaTexture: { value: null },
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

  const blurPass = new BlurPass();

  // --------------------------------------------------------------------------------- Effects

  lightComposer = new EffectComposer(renderer, { depthBuffer: false });
  const savePass = new SavePass();
  const newRenderTarget = Object.create(renderTarget);
  newRenderTarget.texture = renderTarget.texture[2];
  lightComposer.autoRenderToScreen = false;
  lightComposer.inputBuffer = newRenderTarget;
  lightComposer.addPass(blurPass);
  lightComposer.addPass(savePass);
  bgEffect.uniforms.get('bAlphaTexture').value = savePass.renderTarget.texture;

  // --------------------------------------------------------------------------------- Composer
  composer = new EffectComposer(renderer, { depthBuffer: false });
  const geometry = new EffectPass(main_camera, bgEffect);
  const effectPass = new EffectPass(main_camera, smaaEffect, dofEffect, filmEffect);
  effectPass.setDepthTexture(renderTarget.depthTexture);
  composer.addPass(geometry);
  composer.addPass(effectPass);
  // --------------------------------------------------------------------------------- Composer

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
  filmFolder.add(filmEffect.uniforms.get('grayscale'), 'value').name('grayscale');
  filmFolder.add(filmEffect.uniforms.get('nIntensity'), 'value', filmProps.nIntensity.min, filmProps.nIntensity.max).name('noise intensity');
  filmFolder.add(filmEffect.uniforms.get('sIntensity'), 'value', filmProps.sIntensity.min, filmProps.sIntensity.max).name('scanline intensity');
  filmFolder.add(filmEffect.uniforms.get('sCount'), 'value', filmProps.sCount.min, filmProps.sCount.max).name('scanline count');

  const dofFolder = gui.addFolder('DOFPass');
  dofFolder.add(dofEffect, 'bokehScale', dofProps.bokehScale.min, dofProps.bokehScale.max);

  const blurFolder = gui.addFolder('BlurLight');
  blurFolder.add(blurPass, 'kernelSize', KernelSize).name('kernel size').setValue(KernelSize.MEDIUM);
  blurFolder.add(blurPass.resolution, 'width', {
    very_small: 64, small: 128, medium: 256, large: 512,
  }).name('kernel size').setValue(256);
  blurFolder.add(blurPass.resolution, 'height', {
    very_small: 64, small: 128, medium: 256, large: 512,
  }).name('kernel size').setValue(256);
  // --------------------------------------------------------------------------------- GUI

  animate();
}

init();
