/** 
 * A simple vertex shader that just passes thru the
 * position and neighbors to the fragment shader.
 * */

export const passThroughWithNeightborsVert = /*glsl*/ `#version 300 es

precision highp float;

layout(location = 0) in vec2 position;

out vec2 texCoord;
out vec2 topNeighbor;
out vec2 rightNeighbor;
out vec2 bottomNeighbor;
out vec2 leftNeighbor;

// The dimensions of a texel
uniform vec2 texelDims;

void main() {
    texCoord = position * 0.5 + 0.5;
    topNeighbor = texCoord + vec2(0.0, texelDims.y);
    rightNeighbor = texCoord + vec2(texelDims.x, 0.0);
    bottomNeighbor = texCoord + vec2(0.0, -texelDims.y);
    leftNeighbor = texCoord + vec2(-texelDims.x, 0.0);
    gl_Position = vec4(position, 0.0, 1.0);
}
`;
