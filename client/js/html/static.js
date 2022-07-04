/* eslint-disable class-methods-use-this */
/* eslint-disable no-useless-constructor */
import {
  UVMapping, ClampToEdgeWrapping, LinearFilter, CanvasTexture,
  Vector2, BufferAttribute, Mesh, PlaneGeometry, InstancedBufferAttribute,
  Vector3, ShaderMaterial, InstancedMesh, GLSL3, RepeatWrapping, Vector4,
} from 'three';
import {
  viewportToPx, imageSizeSprite, parseViewport, parseHTMLDataset,
  imageSizeSpriteLoad, setupTexture, quadGeometry, getVisiblePlane,
  getRandomRange, clampSpread,
} from '../utils';
import parseHTML from '../parseHTML';
import {
  planes, updatableU, shaders, maxX,
} from '../constants';

class HTMLObj {
  constructor(toCanvas, camera) {
    this.toCanvas = toCanvas;
    this.camera = camera;
    this.depth = parseViewport(toCanvas.dataset.pz, camera, 0);
    const { static: s, viewport: v } = parseHTMLDataset(toCanvas.dataset);
    this.static = s;
    this.viewport = v;
  }

  createMesh() {
    this.mesh = new Mesh(new PlaneGeometry(10, 10));
  }

  updateViewport(y) {
    y = Math.abs(y);
    Object.entries(this.viewport).forEach(([k, v]) => {
      this.static[k] = viewportToPx(v.val, v.unit, this.depth, this.camera, maxX, y);
    });
  }

  setPosition(...position) {
    this.mesh.position.set(...position);
  }

  setRotation(...rotation) {
    this.mesh.rotation.set(...rotation);
  }

  setScale(x, y, z) {
    x *= clampSpread(-1, this.static.flipX || 1, 1);
    y *= clampSpread(-1, this.static.flipY || 1, 1);
    this.mesh.scale.set(x, y, z);
  }

  setMatrix() {
    this.setPosition(this.static.px || 0, this.static.py || 0, this.static.pz || 0);
    this.setRotation(this.static.rx || 0, this.static.ry || 0, this.static.rz || 0);
    this.setScale(this.static.sx || 1, this.static.sy || 1, this.static.sz || 1);
  }
}

class UpdatableObj extends HTMLObj {
  constructor(toCanvas, camera) {
    super(toCanvas, camera);
    this.config = {
      ...shaders.basic,
      uniforms: {
        ...updatableU,
        ...shaders.basic.uniforms,
      },
    };
    this.setLightMult(this.static.lightMult);
  }

  async updateAnimation() {
    this.mesh.material.uniforms.rotation = { value: this.static.aRotation || 0 };
    this.mesh.material.uniforms.jitterMult = { value: this.static.jitterMult || 0 };
    this.mesh.material.uniforms.jitterSpeed = { value: this.static.jitterSpeed || 0 };
    this.mesh.material.uniforms.jitterVX = {
      value: new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
    };
    this.mesh.material.uniforms.jitterVY = {
      value: new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
    };
    const noise = await setupTexture('perlin', RepeatWrapping, RepeatWrapping);
    this.mesh.material.uniforms.noise = { value: noise.dif };
  }

  setLightMult(mult) {
    this.config.uniforms.lightMult = mult ? { value: mult } : this.config.uniforms.lightMult;
  }
}

export class TextObj extends UpdatableObj {
  async createMesh() {
    const params = {
      windowWidth: Math.min(
        this.static.maxWidth,
        this.toCanvas.clientWidth,
      ) - this.static.padding,
      backgroundColor: null,
      scale: 1.0,
    };

    this.canvas = await parseHTML(this.toCanvas, params);

    this.textures = {};
    this.textures.dif = new CanvasTexture(
      this.canvas, UVMapping, ClampToEdgeWrapping,
      ClampToEdgeWrapping, LinearFilter, LinearFilter,
    );

    this.mesh = imageSizeSprite(
      this.textures,
      this.config,
      new Vector2(this.static.pivotX, this.static.pivotY),
    );
  }
}

export class SpriteObj extends UpdatableObj {
  async createMesh() {
    const pivot = new Vector2(
      this.static.pivotX,
      this.static.pivotY,
    );
    this.mesh = await imageSizeSpriteLoad(this.static.name, this.config, pivot);
  }
}

export class AirshipParticleObj extends HTMLObj {
  constructor(toCanvas, camera) {
    super(toCanvas, camera);
    this.config = shaders.airships;
    this.setLightMult(this.static.lightMult);
  }

  async createMesh() {
    const geometry = quadGeometry();
    const {
      count, nearOffset, farOffset, offsetMultX, offsetMultY, speedRangeX, speedRangeY, size,
    } = this.static;
    const textures = await setupTexture(this.static.name, ClampToEdgeWrapping, ClampToEdgeWrapping);
    const imgAspect = textures.dif.image.width / textures.dif.image.height;

    const scale = Array(4).fill(null).reduce((acc) => {
      acc.push(size * imgAspect, size);
      return acc;
    }, []);
    geometry.setAttribute('scale', new BufferAttribute(new Float32Array(scale), 2));

    const offsetWithVel = new InstancedBufferAttribute(new Float32Array(count * 4), 4, false);
    for (let i = 0; i < count; i++) {
      const randomVector = new Vector3();
      randomVector.z = Math.random() * (planes.y - nearOffset - farOffset);
      const zPlane = getVisiblePlane(nearOffset + randomVector.z, this.camera);
      zPlane.w *= 2.0;
      zPlane.h *= 2.0;
      randomVector.x = (Math.random() - 0.5) * zPlane.w * offsetMultX;
      randomVector.y = (Math.random() - 0.5) * zPlane.h * offsetMultY;

      const direction = Math.sign(Math.random() - 0.5);
      const velocity = getRandomRange(new Vector2(speedRangeX, speedRangeY));
      randomVector.x += zPlane.w * 1.5 * direction;

      offsetWithVel.array[i * 4 + 0] = randomVector.x + size * Math.sign(randomVector.x);
      offsetWithVel.array[i * 4 + 1] = randomVector.y;
      offsetWithVel.array[i * 4 + 2] = -randomVector.z - nearOffset;
      offsetWithVel.array[i * 4 + 3] = velocity;
    }

    geometry.setAttribute('offsetVel', offsetWithVel);
    const material = new ShaderMaterial({
      ...this.config,
      uniforms: {
        ...this.config.uniforms,
        ...updatableU,
        dif: { value: textures.dif },
        light: { value: textures.light },
      },
      transparent: true,
      depthTest: true,
      glslVersion: GLSL3,
    });
    this.mesh = new InstancedMesh(geometry, material, count);
  }

  setLightMult(mult) {
    this.config.uniforms.lightMult = mult ? { value: mult } : this.config.uniforms.lightMult;
  }
}

export class FogParticleObj extends HTMLObj {
  constructor(toCanvas, camera) {
    super(toCanvas, camera);
    this.config = shaders.fog;
  }

  async createMesh() {
    const geometry = quadGeometry();
    const {
      count, angleRangeX, angleRangeY, aSpeedRangeX, aSpeedRangeY,
      speedRangeX, speedRangeY, scaleRangeX, scaleRangeY,
    } = this.static;
    const textures = await setupTexture(this.static.name, ClampToEdgeWrapping, ClampToEdgeWrapping);
    const texAspect = textures.dif.image.width / textures.dif.image.height;
    // x - angle, y - velocity, z - angular velocity w - life time
    const movement = new InstancedBufferAttribute(new Float32Array(count * 3), 3);
    const scale = new InstancedBufferAttribute(new Float32Array(count * 2), 2);
    for (let i = 0; i < count; i++) {
      const dir = Math.sign(Math.random() - 0.5);
      movement.array[i * 3 + 0] = getRandomRange(new Vector2(angleRangeX, angleRangeY));
      movement.array[i * 3 + 1] = getRandomRange(new Vector2(speedRangeX, speedRangeY));
      movement.array[i * 3 + 2] = getRandomRange(new Vector2(aSpeedRangeX, aSpeedRangeY)) * dir;

      const randomScale = getRandomRange(new Vector2(scaleRangeX, scaleRangeY));
      scale.array[i * 2 + 0] = randomScale * texAspect;
      scale.array[i * 2 + 1] = randomScale;
    }

    geometry.setAttribute('movement', movement);
    geometry.setAttribute('scale', scale);
    const material = new ShaderMaterial({
      uniforms: {
        ...this.config.uniforms,
        ...updatableU,
        dif: { value: textures.dif },
      },
      vertexShader: this.config.vertexShader,
      fragmentShader: this.config.fragmentShader,
      transparent: true,
      depthTest: true,
      glslVersion: GLSL3,
    });
    this.mesh = new InstancedMesh(geometry, material, count);
  }
}
