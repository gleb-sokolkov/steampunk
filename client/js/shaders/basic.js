import { Vector2 } from 'three';

const basic = {
  uniforms: {
    dif: { value: null },
    rotation: { value: 0 },
    jitterSpeed: { value: 0 },
    jitterMult: { value: 0 },
    jitterVX: { value: new Vector2(0, 0) },
    jitterVY: { value: new Vector2(0, 0) },
    noise: { value: null },
  },
  vertexShader: `
    out vec2 vuv;

    uniform float time;
    uniform float rotation;
    uniform float jitterSpeed;
    uniform float jitterMult;
    uniform vec2 jitterVX;
    uniform vec2 jitterVY;
    uniform sampler2D noise;  

    vec2 rotZ(vec2 v, float a) {
      vec2 cs = vec2(cos(a), sin(a));
      return mat2(cs.x, -cs.y, cs.y, cs.x) * v;
    }

    vec2 getJitter() {
      vec4 sv = vec4(jitterVX.x, jitterVX.y, jitterVY.x, jitterVY.y) * time * jitterSpeed;

      float vx = texture(noise, sv.xy).r;
      float vy = texture(noise, sv.zw).r;
      
      return vec2(vx, vy) * 2. * jitterMult - jitterMult;
    }

    void main() {
      vec4 newPos = vec4(position, 1.0);
      newPos.xy = rotZ(newPos.xy, rotation * time);
      newPos.xy += getJitter();
      gl_Position = projectionMatrix * modelViewMatrix * newPos;
      vuv = uv;
    }
  `,
  fragmentShader: `
    layout(location = 0) out vec4 color;
    layout(location = 1) out vec4 noise;
    layout(location = 2) out vec4 colortex2;
    in vec2 vuv;

    uniform sampler2D dif;
    uniform sampler2D light;

    void main() {
      vec4 col = texture(dif, vuv);
      float light = texture(light, vuv).r;
      if(col.a <= 0.1) discard;
      color = col;
      noise = vec4(0.0);
      colortex2 = vec4(col.a, light, 0.0, 1.0);
    }
  `,
};

export default basic;
