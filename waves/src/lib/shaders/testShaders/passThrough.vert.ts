export const passThroughVert = /*glsl*/ `#version 300 es

in vec4 position;

void main() {
    gl_Position = position * 0.5 + 0.5;
}
`;