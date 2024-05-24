// copies 1 texture to another
export const copyFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;
uniform sampler2D source;
out vec4 color;

void main() {
    color = texture(source, texCoord);
}
`;