/** Shader for n iterations of the Jacobi method */
export const jacobiFrag = /* glsl */ `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform float alpha;       
uniform float rBeta;       // reciprocal beta

uniform sampler2D xTexture;   // x vector (Ax = b)
uniform sampler2D bTexture;   // b vector (Ax = b)

out vec4 xNew;

void main() {
    // neighbors
    vec2 top = texture(xTexture, topNeighbor).xy;
    vec2 right = texture(xTexture, rightNeighbor).xy;
    vec2 bottom = texture(xTexture, bottomNeighbor).xy;
    vec2 left = texture(xTexture, leftNeighbor).xy;

    // b vector
    vec2 b = texture(bTexture, texCoord).xy;

    xNew = vec4((top + right + bottom + left + alpha * b) * rBeta, 0.0, 1.0);
}
`