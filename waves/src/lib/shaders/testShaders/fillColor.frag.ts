export const fillColorFrag = /*glsl*/ `#version 300 es

precision mediump float;
uniform vec4 color;
out vec4 fragColor;

void main() {
    fragColor = vec4(color);
}
`;