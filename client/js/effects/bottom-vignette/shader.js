export default `
  uniform float scrollY;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 col = inputColor;
    vec2 suv = vec2(uv.x, uv.y-.35*scrollY);
    col.rgb *= 1.-pow(suv.y-.65, 2.0);
    outputColor = col;
  }
`;
