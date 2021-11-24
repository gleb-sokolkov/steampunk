import {
  UVMapping, ClampToEdgeWrapping, LinearFilter, CanvasTexture,
  Vector2,
} from 'three';
import { viewportToPx, imageSizeSprite, matchViewport } from '../utils';
import parseHTML from '../parseHTML';

export default class HTMLObj {
  constructor(toCanvas, camera, maxY) {
    this.toCanvas = toCanvas;
    this.dataset = toCanvas.dataset;
    this.camera = camera;

    this.depth = 0;
    const data = matchViewport(this.dataset.z);
    if (data) this.depth = viewportToPx(data[1], data[3], 0, this.camera, this.maxY);
    this.dataset = this.parseHTMLDataset();
    maxY.subscribe({
      next: (y) => {
        this.viewport.forEach((i) => {
          this.dataset[i.key] = viewportToPx(i.val, i.unit, this.depth, this.camera, y);
        });
        console.log(this.dataset);
      },
    });

    this.params = {
      windowWidth: Math.min(
        this.dataset.maxWidth,
        toCanvas.clientWidth - this.dataset.padding,
      ),
      scale: 1.0,
    };
  }

  async createMesh(config) {
    this.canvas = await parseHTML(this.toCanvas, this.params);
    this.texture = new CanvasTexture(
      this.canvas, UVMapping, ClampToEdgeWrapping,
      ClampToEdgeWrapping, LinearFilter, LinearFilter,
    );

    this.mesh = imageSizeSprite(this.texture, config, new Vector2(...this.dataset.pivot));
    [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z] = [
      this.dataset.x,
      this.dataset.y,
      this.dataset.z,
    ];

    return this.mesh;
  }

  parseHTMLDataset() {
    this.viewport = [];
    const newDataset = Object.entries({ ...this.dataset })
      .reduce((acc, [k, v]) => {
        let val = v.split(',').map((str) => {
          if (!Number.isNaN(parseFloat(str))) {
            const data = matchViewport(str);
            if (!data) return +str;
            this.viewport.push({ val: data[1], unit: data[3], key: k });
            return str;
          } return v;
        });
        val = val.length === 1 ? val[0] : val;
        acc[k] = val;
        return acc;
      }, {});
    return newDataset;
  }
}
