// Vertex shader
const vertexShaderSource = `
attribute vec3 vertex;
uniform mat4 ModelViewMatrix, ProjectionMatrix;

void main() {
    vec4 v = ModelViewMatrix * vec4(vertex, 1.0);
    gl_Position = ProjectionMatrix * v;

}`;


// Fragment shader
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

uniform vec4 color;

void main() {
    
    gl_FragColor = color;
}`;