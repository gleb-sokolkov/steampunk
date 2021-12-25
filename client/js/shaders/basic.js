const basic = {
  uniforms: {
    dif: { value: null },
    rotation: { value: 0 },
  },
  vertexShader: `
    out vec2 vuv;

    uniform float time;
    uniform float rotation;

    vec2 rotZ(vec2 v, float a) {
      vec2 cs = vec2(cos(a), sin(a));
      return mat2(cs.x, -cs.y, cs.y, cs.x) * v;
    }

    void main() {
      vec4 newPos = vec4(position, 1.0);
      newPos.xy = rotZ(newPos.xy, rotation * time);
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

    void main() {
      vec4 col = texture(dif, vuv);
      if(col.a <= 0.05) discard;
      color = col;
      noise = vec4(0.0);
      colortex2 = vec4(col.a, 1.0, 0.0, 1.0);
    }
  `,
};

export default basic;
