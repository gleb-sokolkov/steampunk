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

  const vec3 skyUp = vec3(0.7, 0.75, 0.8);
  const vec3 skyDown = vec3(0.12, 0.14, 0.2);
  const vec3 sunColor = vec3(1.0, 0.75, 0.65);
  const vec3 tColor = vec3(.85, .9, 1.);
  const float twidth = 0.02;

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

  float rainfbm(vec2 uv) 
  {
    const int rainOctaves = 3;
    const vec2 size = vec2(30.0);
    const float density = 1.0;
    const float circleRadius = 0.15;

    vec2 sp = vec2(-50.0, 25.0);
    vec3 col = vec3(0.0);
    float v = 0.0;
    float a = 1.0;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    float rot = cos(0.5);

    for (int i = 0; i < rainOctaves; ++i) 
    {
      vec2 rm = uv*size+mod(time, 10.)*sp;
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
    const float brightness = 1.;
    float rn = rainfbm(vec2(uv.x+uv.y, uv.y));
    return skyDown*rn*pow(1.-s, 2.0)*brightness;
  }

  vec3 clouds(vec2 muv, float s) 
  {
    vec3 color = mix(skyDown, skyUp, s);
    float aspect = resolution.x / resolution.y;
    float sp = length(vec2(muv.x-0.25*aspect, muv.y-0.3));
    float sun = smoothstep(0.04, 0.0, sp);
    float sunFlare = smoothstep(0.7, 0.0, sp);

    return color + (sunColor*0.4*sunFlare + sun*sunColor)*s*smoothstep(.5, .0, scrollY)*.7;
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
    const float tStrength = 7000.;

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
      tline += plot(tuv2.yx, y, 0.4) * a * .05 * lightDuration;

      uv = uv * 2.0 + shift;

      a *= .75;
    }

    return tline*tStrength;
  }

  vec3 getStormColor(vec2 uv, float s) {
    float tline = tshape(uv)*smoothstep(0.,1.,uv.y+.3);
    tline *= pow(pow(1.-s, 8.), 2.0);
    return tline * tColor;
  } 


  void main() 
  {
    vec2 uv = gl_FragCoord.xy / resolution.y;
    vec2 muv = (gl_FragCoord.xy - resolution * .5) / resolution.y;
    uv.y -= .35*scrollY;
    float s = texture(noise, vUv).r;
    vec3 color = clouds(muv, s);
    color += getRainColor(uv, s);
    color += getStormColor(uv, s);
    pc_FragColor = vec4(color, 1.);
  }
`;

export { vertex, fragment };
