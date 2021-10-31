const fog = {
  uniforms: {
    baseOpaque: { value: 1.0 },
  },
  vertexShader: `
    attribute vec3 movement;
    attribute vec2 scale;

    out vec2 vUv;
    out float fade;
    out float angleVelocity;

    uniform float time;
    uniform float scrollY;

    vec2 rotZ(vec2 v, float a) {
      float c = cos(a);
      float s = sin(a);
      mat2 m = mat2(c, -s, s, c);
      return m * v;
    }

    void main() {
      vec3 offset = position;
      float mt = mod(time, movement.y);
      float mtn = mod(time, movement.y) / movement.y;
      offset.xy *= scale + scale * mt;
      offset.y += mt * movement.y;
      offset.xy = rotZ(offset.xy, movement.x);
      fade = smoothstep(1., 0., abs(mtn*2.-1.));

      vUv = rotZ(uv-0.5, movement.z * time);
      vUv += 0.5;
      angleVelocity = movement.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(offset, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dif;
    uniform float baseOpaque;

    in vec2 vUv;
    in float fade;


    void main() {
      vec4 col = texture(dif, vUv) * fade;
      if (col.a <= 0.05) discard;
      gl_FragColor = vec4(col.rgb, col.a*baseOpaque);
    }
  `,
};

export default fog;
