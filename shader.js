// Vertex shader
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 textureCoords;
uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix, ProjectionMatrix;
uniform mat4 normalMat;

// TEXTURE
uniform float fAngleRad;
uniform vec2 fUserPoint;

varying vec4 color;
varying vec2 vTextureCoords;
uniform vec4 colorU;

mat4 getRotateMat(float angleRad) {
  float c = cos(angleRad);
  float s = sin(angleRad);

  return mat4(
    vec4(c, s, 0.0, 0.0),
    vec4(-s, c, 0.0, 0.0),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 getTranslateMat(vec2 point) {
  return mat4(
    vec4(1.0, 0.0, 0.0, point.x),
    vec4(0.0, 1.0, 0.0, point.y),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

void main() {
  vec4 vertPos4 = ModelViewMatrix * vec4(vertex, 1.0);
  vec3 vertPos = vec3(vertPos4) / vertPos4.w;
  vec3 normalInterp = vec3(normalMat * vec4(normal, 0.0));
  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(vertex,1.0);

  vec3 normal = normalize(normalInterp);
  

  mat4 rotatedMat = getRotateMat(fAngleRad);
  mat4 translated = getTranslateMat(-fUserPoint);
  mat4 translatedBack = getTranslateMat(fUserPoint);

  vec4 tr = translated * vec4(textureCoords, 0, 0);
  vec4 rotated = tr * rotatedMat;
  vec4 trBack = rotated * translatedBack;

  vTextureCoords = vec2(trBack);
  vTextureCoords = textureCoords;
}`;


// Fragment shader
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec4 color;
varying vec2 vTextureCoords;
uniform sampler2D tmu;
uniform vec4 colorU;

void main() {
  vec4 texture = texture2D(tmu, vTextureCoords);
  gl_FragColor = texture * color;
  if(colorU.x>0.5){
    gl_FragColor = texture;
  }
}`;