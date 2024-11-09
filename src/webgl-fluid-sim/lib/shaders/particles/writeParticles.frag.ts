// writes particle positions to a texture
export const writeParticlesFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

out vec4 color;

void main() {
    color = vec4(texCoord, 0.0, 1.0);
}
`;