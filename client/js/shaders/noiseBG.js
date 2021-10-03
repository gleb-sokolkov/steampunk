const vertex = `
  void main()
  {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = `
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
  const float size = 2.5;
  const vec2 speed = vec2(0.25, 0.1);

  const vec3 skyUp = vec3(0.7, 0.75, 0.8);
  const vec3 skyDown = vec3(0.12, 0.14, 0.2);
  const vec3 sunColor = vec3(1.0, 0.75, 0.65);
  const vec3 tColor = vec3(.85, .9, 1.);


  const float twidth = 0.02;

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

  float random(float x) 
  {
    return fract(sin(x)*22345.61424);
  }

  float random(vec2 v) 
  {
    return fract(sin(dot(v, vec2(1421.124, 14127.1231))));
  }

  float plot(vec2 st, float pct, float w)
  {
    return  smoothstep( pct-w, pct, st.y) -
            smoothstep( pct, pct+w, st.y);
  }



  float getS(vec2 uv, vec2 muv) 
  {
    float invY = 1.-uv.y;
    float t = fbm(muv*size*invY)*.25+.75;
    t = mix(t, 0.0, uv.y-1.0);
    return pow(t, 2.*invY)*(uv.y+.25);
  }

  float rainfbm(vec2 uv) 
  {
    const vec2 size = vec2(30.0);
    const float density = 1.0;
    const float circleRadius = 0.1;

    vec2 sp = vec2(-50.0, 25.0);
    vec3 col = vec3(0.0);
    float v = 0.0;
    float a = 1.0;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    float rot = cos(0.5);

    for (int i = 0; i < NUM_OCTAVES; ++i) 
    {
      vec2 rm = uv*size+time*sp;
      float r = random(floor(rm.x));
      float rainMask = step(r, density);
      uv = rot * uv * 2.0 + shift;
      rm.y = rm.y * smoothstep(0.0, 1.0, r+circleRadius) + r*10.0;

      a *= 0.5;

      if(v > 0.0) continue; 
      vec2 ruv = fract(rm);
      float offset = random(floor(rm));
      float circle = step(length(ruv-vec2(0.5+offset*0.3)), circleRadius*ruv.y);
      v += circle * rainMask * a;
    }
    return v;
  }

  vec3 getRainColor(vec2 uv, float s) 
  {
    const float brightness = 3.;
    float rn = rainfbm(vec2(uv.x+uv.y, uv.y));
    return skyDown*rn*pow(1.-s, 2.)*brightness;
  }

  vec3 clouds(vec2 muv, float s) 
  {
    vec3 color = mix(skyDown, skyUp, s);
    float sp = length(vec2(muv.x-0.4, muv.y-0.3));
    float sun = smoothstep(0.04, 0.0, sp);
    float sunFlare = smoothstep(0.7, 0.0, sp);

    return color + (sunColor*0.4*sunFlare + sun*sunColor)*s*(1.-scrollY);
  }

  float tshape(vec2 uv) 
  {
    float baseSize = 6.0;     
    vec2 tuv = fract(uv*vec2(baseSize, 1.));
    vec2 tid = floor(uv*vec2(baseSize, 1.));
    float r = random(tid.x);
    float d = step(r, 0.5);
    
    const int octaves = 2;
    const vec2 td = vec2(.002,.998);
    const float tf = 0.02;
    const float tspeed = 10.;
    const float tStrength = 2000.;

    float tline = 0.;
    float a = 0.1;
    
    for(int k = 0; k < octaves; k++) 
    {
      float y = 0.0;
      float amplitude = 0.5;
      float frequency = 2.0;
      float sum_a = 0.0;
      
      vec2 tuv2 = fract(uv*vec2(baseSize, 1.));
      vec2 tid2 = floor(uv*vec2(baseSize, 1.));
      float r2 = random(tid2.x);
      float rl = random(tid2.x+floor(time*2.0));
      float d2 = step(r2, .5);

      const int sin_octaves = 6;
      const float density = 1.0;
      const float shift = 10.0;
      float lacunarity = 2.0 + rl * 2.0;
      float gain = 0.5 - rl * 0.2;

      for(int i = 0; i < sin_octaves; i++) 
      {
        y += sin(tuv.y*frequency)*amplitude;
        frequency *= lacunarity;
        sum_a += amplitude;
        amplitude *= gain;
      }
  
      y /= sum_a;
      y = abs(d2 - y)*.9;
  
      //this row makes lines seamless. This works correct only with numbers which are multiple of two 
      const float seamlessFactor = 4.;
      y = mix(y, .5, pow(tuv.y*2.-1., seamlessFactor));
      
      float lightDuration = smoothstep(td.x, .0, abs(fract(time*tf+rl*0.001)-r2*td.y+td.x));
      tline += plot(tuv2.yx, y, twidth) * a * lightDuration;
      tline += plot(tuv2.yx, y, 0.4) * a * .1 * lightDuration;

      uv = uv * 2.0 + shift;

      a *= .75;
    }

    return tline*tStrength;
  }

  vec3 getStormColor(vec2 uv, float s) {
    float tline = tshape(uv)*smoothstep(0.,1.,uv.y+.3);
    tline *= pow(1.-s, 8.);
    return tline * tColor;
  } 

  void main()
  {
    vec2 uv = gl_FragCoord.xy / resolution.y;
    vec2 muv = (gl_FragCoord.xy - resolution * .5) / resolution.y;
    uv.y -= .35*scrollY;

    float s = getS(uv, muv);
    vec3 color = clouds(muv, s);
    color += getRainColor(uv, s);
    color += getStormColor(uv, s);

    // bottom shading
    color *= 1.-pow(uv.y-1.+.35, 4.0);


    gl_FragColor = vec4(color, 1.0);
  }
`;

export { vertex, fragment };
