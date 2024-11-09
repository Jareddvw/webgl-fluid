// gradient subtraction shader
export const gradientSubtractFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform float halfrdx;
uniform sampler2D pressure;
uniform sampler2D divergentVelocity;

out vec4 color;

void main() {
    float pL = texture(pressure, leftNeighbor).x;
    float pR = texture(pressure, rightNeighbor).x;
    float pB = texture(pressure, bottomNeighbor).x;
    float pT = texture(pressure, topNeighbor).x;

    vec2 vel = texture(divergentVelocity, texCoord).xy;

    vec2 gradient = vec2(pR - pL, pT - pB);
    if (halfrdx > 0.0) {
        gradient = halfrdx * vec2(pR - pL, pT - pB);
    }

    color = vec4(vel - gradient, 0.0, 1.0);
}
`