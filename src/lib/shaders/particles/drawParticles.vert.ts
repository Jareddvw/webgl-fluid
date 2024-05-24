/**
 * Vertex shader which transforms the point given by the particle index
 * to a position encoded in the particle texture.
 */
export const drawParticlesVert = /* glsl */ `#version 300 es

precision highp float;

layout(location=0) in float index;

uniform sampler2D particles;
uniform vec2 canvasSize;
uniform float numParticles;
uniform float pointSize;

out vec2 texCoord;
out float indexOut;

// given an index and the canvas width and height, 
// return the xy position of the particle
vec2 decode(float index, vec2 canvasSize) {
    vec2 texelSize = 1.0 / canvasSize;
    float y = floor(index / canvasSize.x);
    float x = mod(index, canvasSize.x);
    return vec2(x, y) * texelSize + texelSize * 0.5;
}

void main() {
    indexOut = index;
    // steps: 1. create a texture and fill it with the default particle positions
    // 2. have some way of decoding the particle positions from the texture
    vec4 value = texture(particles, decode(index, canvasSize));

    // 3. decode the value into a position
    texCoord = value.xy;

    gl_PointSize = pointSize;
    // scale back from [0, 1] to [-1, 1]
    gl_Position = vec4((value.xy * 2.0 - 1.0), 0.0, 1.0);
}`