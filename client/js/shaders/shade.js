const vertex = `
  out vec2 vUv;

  void main()
  {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`;
const fragment = `
  precision mediump float;
  uniform float time;
  uniform vec2 resolution;
  uniform float scrollY;
  uniform sampler2D tDiffuse;

  in vec2 vUv;

  const vec3 shadeColor = vec3(.04, .04, .04);

  void main() 
  {
    vec4 lastPassColor = texture(tDiffuse, vUv);
    float m = 1.-pow(vUv.y, 1.);
    vec3 mixedColor = mix(lastPassColor.rgb, shadeColor, m*scrollY);

    gl_FragColor = vec4(mixedColor, lastPassColor.a);
  }
`;

export { vertex, fragment };
