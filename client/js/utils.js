import {
  PlaneGeometry, Mesh, Vector2, ShaderMaterial, GLSL3,
  ClampToEdgeWrapping, InstancedBufferGeometry, BufferAttribute,
  NearestFilter, TextureLoader,
} from 'three';

const loader = new TextureLoader();

function getRandomRange(vec) {
  return Math.random() * (vec.y - vec.x) + vec.x;
}

function transpose(a) {
  return a[0].map((_, c) => a.map((r) => r[c]));
}

function getRandomSet(size, count) {
  if (size * count > 0) return null;

  const calc = () => new Array(size).fill(0).map(Math.random);

  return transpose(new Array(count).fill(0).map(calc));
}

function imageSizeSprite(textures, config, pivot = new Vector2(0.0, 0.0)) {
  const geometry = new PlaneGeometry(textures.dif.image.width, textures.dif.image.height);
  geometry.translate(pivot.x * textures.dif.image.width, pivot.y * textures.dif.image.height, 0);
  const material = new ShaderMaterial({
    ...config,
    uniforms: {
      ...config.uniforms,
      dif: { value: textures.dif },
      light: { value: textures.light },
    },
    transparent: true,
    depthTest: true,
    glslVersion: GLSL3,
  });
  const sprite = new Mesh(geometry, material);
  return sprite;
}

const setupTexture = (() => {
  const data = {};
  const images = mapFiles(require.context('../images/', true, /\.(png|jpe?g)$/));
  return async (
    name, wrapS, wrapT,
    flipY = false,
    minFilter = NearestFilter,
    magFilter = NearestFilter,
  ) => {
    if (data[name]) return data[name];
    const path = images[name];
    const textures = {};
    if (path.dif) {
      textures.dif = await loader.loadAsync(path.dif);
    }
    if (path.light) {
      textures.light = await loader.loadAsync(path.light);
    }
    Object.values(textures).forEach((texture) => {
      [texture.wrapS, texture.wrapT] = [wrapS, wrapT];
      [texture.minFilter, texture.magFilter] = [minFilter, magFilter];
      texture.flipY = flipY;
    });
    data[name] = textures;
    return textures;
  };
})();

async function imageSizeSpriteLoad(name, config, pivot) {
  const textures = await setupTexture(name, ClampToEdgeWrapping, ClampToEdgeWrapping, true);
  return imageSizeSprite(textures, config, pivot);
}

const getVisiblePlane = (() => {
  const data = {};
  return (z, cam) => {
    if (data[z]) return data[z];
    const h = z * Math.tan(cam.fov * 0.5 * Math.PI / 180);
    const w = h * cam.aspect;
    data[z] = { w, h };
    return data[z];
  };
})();

function matchViewport(str) {
  return str.match(/^(-?\d+([.]\d+)?)(vx|vy|vz)$/);
}

function viewportToPx(val, unit, depth, cam, maxY) {
  const plane = getVisiblePlane(Math.abs(depth), cam);
  val *= 0.01;
  if (unit === 'vx') {
    return val * plane.w * 2.0;
  } if (unit === 'vy') {
    return val * (plane.h + maxY);
  } if (unit === 'vz') {
    const sign = Math.sign(val);
    return (Math.abs(val) * (cam.far - cam.near) + cam.near) * sign;
  }
  return +val;
}

function parseViewport(str, cam, maxY) {
  if (!Number.isNaN(parseFloat(str))) {
    const data = matchViewport(str);
    if (!data) return +str;
    return viewportToPx(data[1], data[3], 0, cam, maxY);
  }
  return str;
}

function parseHTMLDataset(dataset) {
  const newDataset = Object.entries({ ...dataset })
    .reduce((acc, [k, v]) => {
      if (!Number.isNaN(parseFloat(v))) {
        const data = matchViewport(v);
        if (data) {
          acc.viewport[k] = {
            val: data[1],
            unit: data[3],
          };
        } else acc.static[k] = +v;
      } else acc.static[k] = v;
      return acc;
    }, { static: {}, viewport: {} });
  return newDataset;
}

function mapFiles(context) {
  const keys = context.keys();
  const filenameRegex = /([\\/.*]+)([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_.\w+$/;
  const values = keys.map(context);
  return keys.reduce((accumulator, key, index) => {
    const r = key.match(filenameRegex);
    return {
      ...accumulator,
      [r[2]]: {
        ...accumulator[r[2]],
        [r[3]]: values[index],
      },
    };
  }, {});
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

export {
  getRandomRange, transpose, getRandomSet, imageSizeSprite, setupTexture,
  imageSizeSpriteLoad, viewportToPx, parseHTMLDataset, getVisiblePlane,
  matchViewport, parseViewport, mapFiles, quadGeometry,
};
