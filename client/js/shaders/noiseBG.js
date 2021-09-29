const vertex = `
  void main()
  {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = `
  uniform float time;
  uniform vec2 resolution;

  float rand(vec2 v) 
  {
    return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main()
  {
    vec2 uv = (gl_FragCoord.xy - resolution*0.5) / resolution.y;
    float t = rand(floor(uv*100.0+time*2.0));
    vec3 color = vec3(t);
      
    gl_FragColor = vec4(color, 1.0);
  }
`;

export { vertex, fragment };
