const noiseBG = {
  uniforms: {},
  vertexShader: `
    void main()
    {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    layout(location = 0) out vec4 color;
    layout(location = 1) out vec4 noise;
    layout(location = 2) out vec4 colortex2;

    uniform float time;
    uniform vec2 resolution;
    uniform float scrollY;

    vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}

    float cnoise(vec2 P)
    {
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x,gy.x);
      vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z);
      vec2 g11 = vec2(gx.w,gy.w);
      vec4 norm = 1.79284291400159 - 0.85373472095314 * 
        vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
      g00 *= norm.x;
      g01 *= norm.y;
      g10 *= norm.z;
      g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }

    #define NUM_OCTAVES 3
    const float size = 1.5;
    const vec2 speed = vec2(0.25, 0.2);

    float fbm(vec2 x) 
    {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100);
      // Rotate to reduce axial bias
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
      for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * cnoise(x-time*speed);
        x = rot * x * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    float getS(vec2 uv, vec2 muv) 
    {
      float t = fbm(muv*size)*.25+.75;
      t = mix(t, 0.0, uv.y-1.0);
      return pow(t, 2.-2.*uv.y)*(uv.y+.25)*(1.-pow(uv.y-.65, 2.));
    }

    void main()
    {
      vec2 uv = gl_FragCoord.xy / resolution.y;
      vec2 muv = (gl_FragCoord.xy - resolution * .5) / resolution.y;
      uv.y -= .35*scrollY;

      float s = getS(uv, muv);

      color = vec4(0.0);
      noise = vec4(vec3(s), 1.0);
      colortex2 = vec4(0.0);
    }
  `,
};

export default noiseBG;
