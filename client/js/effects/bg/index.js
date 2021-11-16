import { BlendFunction, Effect } from 'postprocessing';
import shader from './shader';

export default class BGEffect extends Effect {
  constructor(uniforms) {
    super('BGEffect', shader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map(uniforms),
    });
  }
}
