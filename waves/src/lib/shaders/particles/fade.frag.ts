/**
 * Fades the color of the texture by fadeFactor.
 */
export const fadeFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D tex;
uniform float fadeFactor;

out vec4 color;

void main() {
    color = vec4(texture(tex, texCoord).xyz * fadeFactor, 1.0);
}
`;