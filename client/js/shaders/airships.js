const airships = {
  uniforms: {},
  vertexShader: `
    attribute vec2 scale;
    attribute vec4 offsetVel;
    out vec2 vUv;

    void main() 
    { 
      vec3 newPos = position;
      newPos.xy *= scale;
      newPos += offsetVel.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0); 
      vUv = uv;
      vUv.y = 1.0 - vUv.y;
    }`,
  fragmentShader: `
    uniform sampler2D tex;
    in vec2 vUv;

    void main() 
    {
      vec4 color = texture(tex, vUv);
      gl_FragColor = color;
    }`,
};

export default airships;
