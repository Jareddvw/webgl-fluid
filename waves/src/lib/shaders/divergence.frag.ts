export const divergenceFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform sampler2D velocity;

void main() {
    // TODO
}`