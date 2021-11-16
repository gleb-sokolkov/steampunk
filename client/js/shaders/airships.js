const airships = {
  uniforms: {},
  vertexShader: `
    attribute vec2 scale;
    attribute vec4 offsetVel;

    uniform float time;
    uniform float scrollY;

    out vec2 vUv;

    vec2 getDistFunc(float x, float d) {
      float t = d;
      float t2 = t * 2.;
      float t4 = t * 4.;

      float s = floor(mod(x, t4)/t4*2.0)*2.-1.;
      float r = mod(x*s, t2)-t;

      return vec2(r, s);
    }

    void main() 
    { 
      vec3 newPos = position;
      newPos.xy *= scale;
      newPos.yz += offsetVel.yz;

      vec2 rs = getDistFunc(time * offsetVel.w, offsetVel.x);
      newPos.x += rs.x;

      vUv = vec2(mix(1.-uv.x, uv.x, rs.y*.5+.5), uv.y);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0); 
    }`,
  fragmentShader: `
    layout(location = 0) out vec4 color;
    layout(location = 1) out vec4 noise;
    uniform sampler2D tex;
    in vec2 vUv;

    void main() 
    {
      vec4 col = texture(tex, vUv);
      if (col.a <= 0.0) discard;
      color = col;
      noise = vec4(0.0);
    }`,
};

export default airships;
