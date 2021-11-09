export default `
  uniform float time;
  uniform bool grayscale;
  uniform float nIntensity;
  uniform float sIntensity;
  uniform float sCount;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 cTextureScreen = inputColor;
    float dx = rand( uv + fract(time) );
    vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );
    vec2 sc = vec2( sin( uv.y * sCount ), cos( uv.y * sCount ) );
    cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;
    cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );

    if( grayscale ) {
      cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );
    }

    outputColor = vec4( cResult, cTextureScreen.a );
  }
`;
