import { BlendFunction, Effect } from 'postprocessing';
import shader from './shader';

export default class BottomVignetteEffect extends Effect {
  constructor(uniforms) {
    super('BottomVignetteEffect', shader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map(uniforms),
    });
  }
}
