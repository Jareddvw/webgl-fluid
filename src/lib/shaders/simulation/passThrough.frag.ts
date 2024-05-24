// Passthrough fragment shader that takes a texture coordinate and samples a texture
export const passThroughFrag = /*glsl*/ `#version 300 es

precision highp float;

in vec2 texCoord;
uniform sampler2D tex;
out vec4 fragColor;

void main() {
    fragColor = texture(tex, texCoord);
}
`