const vertex = `
  out vec2 vUv;

  void main()
  {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`;
const fragment = ` 
  uniform float time;
  uniform vec2 resolution;
  uniform float scrollY;
  uniform sampler2D tDiffuse;
  uniform sampler2D shadetex;

  in vec2 vUv;

  void main() 
  {
    vec4 lastPassColor = texture(tDiffuse, vUv);
    //lastPassColor.rgb *= 1.-pow(1.-vUv.y, 2.0);
    float m = pow(1.-vUv.y, 3.0)*scrollY;
    //lastPassColor.rgb = mix(lastPassColor.rgb, vec3(0.), m);
    vec4 shade = texture(shadetex, vUv*4.0).rgba*scrollY;
    gl_FragColor = shade;
  }
`;

export { vertex, fragment };
