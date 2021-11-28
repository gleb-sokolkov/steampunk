/* eslint-disable max-classes-per-file */
import {
  SpriteObj, TextObj, AirshipParticleObj, FogParticleObj,
} from './static';

export class HTMLCreator {
  constructor() {
    this.creators = {
      text: new TextObjCreator(),
      sprite: new SpriteObjCreator(),
      airships: new AirshipParticleObjCreator(),
      fog: new FogParticleObjCreator(),
    };

    this.objects = [];
  }

  parseElement(elem, ...params) {
    const { type } = elem.dataset;
    const obj = this.creators[type].createObj(...params);
    if (obj) this.objects.push(obj);
    return obj;
  }
}

export class TextObjCreator {
  createObj(...params) {
    return new TextObj(...params);
  }
}

export class SpriteObjCreator {
  createObj(...params) {
    return new SpriteObj(...params);
  }
}

export class AirshipParticleObjCreator {
  createObj(...params) {
    return new AirshipParticleObj(...params);
  }
}

export class FogParticleObjCreator {
  createObj(...params) {
    return new FogParticleObj(...params);
  }
}
