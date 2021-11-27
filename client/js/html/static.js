import {
  UVMapping, ClampToEdgeWrapping, LinearFilter, CanvasTexture,
  Vector2,
} from 'three';
import { Subject } from 'rxjs';
import {
  viewportToPx, imageSizeSprite, matchViewport, parseViewport,
  parseHTMLDataset,
} from '../utils';
import parseHTML from '../parseHTML';

// export default class HTMLObj {
//   constructor(toCanvas, camera, maxY) {
//     this.toCanvas = toCanvas;
//     this.dataset = toCanvas.dataset;
//     this.camera = camera;
//     this.viewport = [];
//     this.depth = parseViewport(this.dataset.z, camera, 0);
//     this.datasetSubject = new Subject();
//     this.params = {};

//     this.dataset = this.parseHTMLDataset();
//     maxY.subscribe({
//       next: (y) => {
//         y = Math.abs(y);
//         this.viewport.forEach((i) => {
//           this.dataset[i.key] = viewportToPx(i.val, i.unit, this.depth, this.camera, y);
//         });
//         this.datasetSubject.next();
//       },
//     });
//   }

//   async createMesh(config) {
//     this.params = {
//       windowWidth: this.dataset.maxWidth - this.dataset.padding,
//       scale: 1.0,
//       backgroundColor: null,
//     };
//     this.canvas = await parseHTML(this.toCanvas, this.params);
//     this.texture = new CanvasTexture(
//       this.canvas, UVMapping, ClampToEdgeWrapping,
//       ClampToEdgeWrapping, LinearFilter, LinearFilter,
//     );

//     this.mesh = imageSizeSprite(this.texture, config, new Vector2(...this.dataset.pivot));
//     this.datasetSubject.subscribe({
//       next: () => {
//         [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z] = [
//           this.dataset.x,
//           this.dataset.y,
//           this.dataset.z,
//         ];
//       },
//     });

//     return this.mesh;
//   }

//   parseHTMLDataset() {
//     const newDataset = Object.entries({ ...this.dataset })
//       .reduce((acc, [k, v]) => {
//         let val = v.split(',').map((str) => {
//           if (!Number.isNaN(parseFloat(str))) {
//             const data = matchViewport(str);
//             if (!data) return +str;
//             this.viewport.push({ val: data[1], unit: data[3], key: k });
//             return str;
//           } return v;
//         });
//         val = val.length === 1 ? val[0] : val;
//         acc[k] = val;
//         return acc;
//       }, {});
//     return newDataset;
//   }
// }

export default class HTMLObj {
  constructor(toCanvas, config, camera) {
    this.toCanvas = toCanvas;
    this.config = config;
    this.camera = camera;
    this.depth = parseViewport(toCanvas.dataset.z, camera, 0);
    const { static: s, viewport: v } = parseHTMLDataset(toCanvas.dataset);
    this.static = s;
    this.viewport = v;
  }

  async createMesh() {
    const params = {
      backgroundColor: null,
      scale: 1.0,
    };

    this.canvas = await parseHTML(this.toCanvas, params);

    this.texture = new CanvasTexture(
      this.canvas, UVMapping, ClampToEdgeWrapping,
      ClampToEdgeWrapping, LinearFilter, LinearFilter,
    );

    this.mesh = imageSizeSprite(
      this.texture,
      this.config,
      new Vector2(this.static.pivotX, this.static.pivotY),
    );
  }

  updateViewport(y) {
    Object.entries(this.viewport).forEach(([k, v]) => {
      this.static[k] = viewportToPx(v.val, v.unit, this.depth, this.camera, y);
    });
  }

  setPosition() {
    [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z] = [
      this.static.x,
      this.static.y,
      this.static.z,
    ];
  }
}
