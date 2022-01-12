import {
  Clock, Vector2,
} from 'three';
import { BehaviorSubject } from 'rxjs';

import noiseBG from './shaders/noiseBG';
import airships from './shaders/airships';
import fog from './shaders/fog';
import basic from './shaders/basic';

const clock = new Clock();
const planes = new Vector2(0.1, 1000);
const fov = 75;
const cameraMaxScrollY = new BehaviorSubject(0);
const scrollSpeed = {
  d: 1.0,
  get D() {
    return this.d;
  },
  set D(value) {
    this.d = Math.max(Math.min(value, this.Max), this.Min);
  },
  min: 1.0,
  get Min() {
    return this.min;
  },
  set Min(value) {
    this.min = value;
  },
  max: 10.0,
  get Max() {
    return this.max + this.Min;
  },
  set Max(value) {
    this.max = value;
  },
};
const dofProps = {
  focusDistance: 0.5,
  focalLength: 0.25,
  bokehScale: {
    d: 4.0,
    min: 0.0,
    max: 5.0,
  },
};
const filmProps = {
  nIntensity: {
    d: 0.1,
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

const shaders = {
  noiseBG,
  airships,
  fog,
  basic,
};

export {
  clock,
  planes,
  fov,
  cameraMaxScrollY,
  scrollSpeed,
  dofProps,
  filmProps,
  airshipOptions,
  updatableU,
  defaultU,
  shaders,
};
