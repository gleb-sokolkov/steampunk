const basic = {
  uniforms: {
    dif: { value: null },
  },
  vertexShader: `
    out vec2 vuv;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
      colortex2 = vec4(col.a, 0.0, 0.0, 1.0);
    }
  `,
};

export default basic;
