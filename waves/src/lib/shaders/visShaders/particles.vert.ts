// A shader that transforms particles to new positions from a texture.
// we have an input texture with the particle positions.
export const particlesVert = /* glsl */ `#version 300 es

precision mediump float;

layout(location=0) in vec2 position;

uniform sampler2D particles;

out vec2 texCoord;

vec2 decode(vec4 value) {
    return value.xy;
}

void main() {
    // steps: 1. create a texture and fill it with the default particle positions
    // 2. have some way of decoding the particle positions from the texture
    vec4 value = texture(particles, position);

    // 3. decode the value into a position
    texCoord = decode(value);
}`