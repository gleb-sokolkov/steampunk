import {
  FloatType, GLSL3, Mesh, NearestFilter, PerspectiveCamera,
  PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector2,
  Vector3, WebGLMultipleRenderTargets, WebGLRenderer,
  InstancedBufferAttribute, BufferAttribute, InstancedMesh,
  ClampToEdgeWrapping, Group, DepthTexture, DepthFormat,
  UnsignedShortType,
} from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';
import {
  EffectComposer, EffectPass, DepthOfFieldEffect,
  SMAAEffect,
} from 'postprocessing';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import { FilmEffect, BGEffect } from './effects';
import {
  setupTexture, getVisiblePlane, getRandomRange, quadGeometry,
} from './utils';
import {
  clock, planes, fov, cameraMaxScrollY, scrollSpeed,
  dofProps, filmProps, airshipOptions, updatableU, shaders,
} from './constants';
import { HTMLCreator } from './html/htmlFactory';

// images & textures
import airship1Texture from '../images/airship1_.png';
import ballons1Texture from '../images/ballons1_.png';
import ballons3Texture from '../images/ballons3_.png';
import fogTexture from '../images/fog_.png';
import cargoCraneTexture from '../images/cargo_crane_.png';
import exhaust1Texture from '../images/exhaust1_.png';

// --------------------------------------------------------------------------------- Render elements
const htmlCreator = new HTMLCreator();
const preScene = new Scene();
const main_camera = new PerspectiveCamera(
  fov,
  window.innerWidth / window.innerHeight,
  ...planes.toArray(),
);
const shipGroup = new Group();
const bottomSprites = new Group();
const contentGroup = new Group();
const canvasObjs = [];
let renderTarget; let renderer; let composer;
let noiseQuad;
let bgEffect;
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

async function fogParticles(texturePath) {
  const geometry = quadGeometry();
  const count = 10;
  const angleRange = new Vector2(-Math.PI * 0.05, Math.PI * 0.05);
  const speedRange = new Vector2(10.0, 40.0);
  const aSpeedRange = new Vector2(0.0, 0.5);
  const texture = await setupTexture(texturePath, ClampToEdgeWrapping, ClampToEdgeWrapping);
  const texAspect = texture.image.width / texture.image.height;
  const scaleRange = new Vector2(5.0, 20.0);
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
      ...shaders.fog.uniforms,
      ...updatableU,
      dif: { value: texture },
    },
    vertexShader: shaders.fog.vertexShader,
    fragmentShader: shaders.fog.fragmentShader,
    transparent: true,
    depthTest: true,
    glslVersion: GLSL3,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  return mesh;
}

async function airshipParticles(texturePath, options = airshipOptions) {
  const geometry = quadGeometry();
  const {
    count, nearOffset, farOffset, offsetMult, speedRange, size,
  } = options;
  const texture = await setupTexture(texturePath, ClampToEdgeWrapping, ClampToEdgeWrapping);
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
    const zPlane = getVisiblePlane(nearOffset + randomVector.z, main_camera);
    zPlane.w *= 2.0;
    zPlane.h *= 2.0;
    randomVector.x = (Math.random() - 0.5) * zPlane.w * offsetMult.x;
    randomVector.y = (Math.random() - 0.5) * zPlane.h * offsetMult.y;

    const direction = Math.sign(Math.random() - 0.5);
    const velocity = getRandomRange(speedRange);
    randomVector.x += zPlane.w * 1.5 * direction;

    offsetWithVel.array[i * 4 + 0] = randomVector.x + size * Math.sign(randomVector.x);
    offsetWithVel.array[i * 4 + 1] = randomVector.y;
    offsetWithVel.array[i * 4 + 2] = -randomVector.z - nearOffset;
    offsetWithVel.array[i * 4 + 3] = velocity;
  }

  geometry.setAttribute('offsetVel', offsetWithVel);
  const material = new ShaderMaterial({
    uniforms: {
      ...shaders.airships.uniforms,
      ...updatableU,
      tex: { value: texture },
    },
    vertexShader: shaders.airships.vertexShader,
    fragmentShader: shaders.airships.fragmentShader,
    transparent: true,
    depthTest: true,
    glslVersion: GLSL3,
  });
  const mesh = new InstancedMesh(geometry, material, count);
  return mesh;
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

  // shipGroup.position.y = -500;
  // const shipMesh1 = await airshipParticles(airship1Texture, {
  //   count: 3,
  //   farOffset: 0,
  //   nearOffset: 500,
  //   offsetMult: new Vector2(1.0, 1.0),
  //   size: 300,
  //   speedRange: new Vector2(25.0, 50.0),
  // });
  // const shipMesh2 = await airshipParticles(ballons3Texture, {
  //   count: 10,
  //   farOffset: 0,
  //   nearOffset: 200,
  //   offsetMult: new Vector2(1.0, 1.0),
  //   size: 100,
  //   speedRange: new Vector2(10.0, 30.0),
  // });
  // const shipMesh3 = await airshipParticles(ballons1Texture, {
  //   count: 10,
  //   farOffset: 600,
  //   nearOffset: 100,
  //   offsetMult: new Vector2(1.0, 1.0),
  //   size: 50,
  //   speedRange: new Vector2(10.0, 20.0),
  // });
  // shipGroup.add(shipMesh1, shipMesh2, shipMesh3);

  // const ccDepth = 200;
  // const ccPlane = getVisiblePlane(ccDepth, main_camera);
  // const cargoCrane = await imageSizeSpriteLoad(cargoCraneTexture, basic, new Vector2(-0.5, 0.5));
  // cargoCrane.scale.multiplyScalar(0.3);
  // cargoCrane.position.x = ccPlane.w;
  // cargoCrane.position.y = -ccPlane.h;
  // cargoCrane.position.z = -ccDepth;

  // const exh1Depth = 799;
  // const exh1Plane = getVisiblePlane(exh1Depth, main_camera);
  // const exh1 = await imageSizeSpriteLoad(exhaust1Texture, basic, new Vector2(0.0, 0.5));
  // exh1.position.x = -200;
  // exh1.position.y = -exh1Plane.h;
  // exh1.position.z = -exh1Depth;

  // bottomSprites.add(cargoCrane, exh1);
  // cameraMaxScrollY.subscribe({
  //   next: (y) => {
  //     bottomSprites.position.y = y;
  //   },
  // });

  preScene.add(noiseQuad, contentGroup);
  // --------------------------------------------------------------------------------- Pre render

  // --------------------------------------------------------------------------------- Composer
  composer = new EffectComposer(renderer, { depthBuffer: false });

  bgEffect = new BGEffect(Object.entries({
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
  // --------------------------------------------------------------------------------- GUI

  animate();
}

init();
