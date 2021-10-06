const vertex = `
  out vec2 vUv;

  void main()
  {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`;
const fragment = ` 
  layout(location = 0) out vec4 pc_FragColor;

  uniform float time;
  uniform vec2 resolution;
  uniform float scrollY;
  uniform sampler2D noise;

  in vec2 vUv;

  void main() 
  {
    vec2 uv = gl_FragCoord.xy / resolution.y;
    uv.y -= .35*scrollY;
    float shade = pow(uv.y-.65, 2.0);
    pc_FragColor = vec4(vec3(.0), shade);
  }
`;

export { vertex, fragment };
