/** Shader for n iterations of the Jacobi method */
export const jacobiFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D prevIteration;    // The previous iteration of the field
uniform sampler2D divergence;       // The divergence field
uniform float alpha;                // relaxation factor
uniform vec2 texelDims;             // The dimensions of a texel
uniform int n;                      // The number of iterations

void main() {
    // TODO
}`