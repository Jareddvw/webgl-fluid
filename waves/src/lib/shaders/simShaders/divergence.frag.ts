// calculate divergence of velocity field
export const divergenceFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform sampler2D velocity;
uniform float gridScale;
uniform vec2 texelDims;

out vec4 color;

void main() {
    float left = texture(velocity, leftNeighbor).x;
    float right = texture(velocity, rightNeighbor).x;
    float bottom = texture(velocity, bottomNeighbor).y;
    float top = texture(velocity, topNeighbor).y;

    float divergence = 0.5 * gridScale * (right - left + top - bottom);
    color = vec4(divergence, divergence, 0.0, 1.0);
}`