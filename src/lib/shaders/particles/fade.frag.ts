/**
 * Fades the color of the texture by fadeFactor.
 */
export const fadeFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D tex;
uniform float fadeFactor;
uniform vec4 bgColor;

out vec4 color;

void main() {
    vec4 texColor = texture(tex, texCoord);
    color = mix(bgColor, texColor, fadeFactor);
}
`;