// Passthrough vertex shader that takes a texture coordinate and passes it to the fragment shader
export const passThroughVert = /*glsl*/ `#version 300 es

precision highp float;

in vec2 position;

// pass the texture coordinates to the fragment shader
out vec2 texCoord;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    texCoord = position * 0.5 + 0.5;
}
`