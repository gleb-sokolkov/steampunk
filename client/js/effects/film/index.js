import { BlendFunction, Effect } from 'postprocessing';
import shader from './shader';

export default class FilmEffect extends Effect {
  constructor(uniforms) {
    super('FilmEffect', shader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map(uniforms),
    });
  }
}
