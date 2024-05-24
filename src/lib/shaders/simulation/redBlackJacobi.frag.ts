/** 
 * Shader for red-black ordering with jacobi method.
 * 
 * This is like a mix of the jacobi and gauss-seidel methods, since
 * it uses neighboring values from the previous iteration to solve
 * for the current cell.
 * https://math.mit.edu/classes/18.086/2006/am62.pdf
 */
export const redBlackJacobiFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform float alpha;
uniform float rBeta;
uniform bool fillRed;  // whether to fill red or black cells. 'red' means even, 'black' means odd

uniform sampler2D xTexture;
uniform sampler2D bTexture;

out vec4 xNew;

void main() {
    if (fillRed) {
        if (mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) == 0.0) {
            vec2 top = texture(xTexture, topNeighbor).xy;
            vec2 right = texture(xTexture, rightNeighbor).xy;
            vec2 bottom = texture(xTexture, bottomNeighbor).xy;
            vec2 left = texture(xTexture, leftNeighbor).xy;
            vec2 b = texture(bTexture, texCoord).xy;
            xNew = vec4((top + right + bottom + left + alpha * b) * rBeta, 0.0, 1.0);
        } else {
            xNew = texture(xTexture, texCoord);
        }
    } else {
        if (mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) == 1.0) {
            vec2 top = texture(xTexture, topNeighbor).xy;
            vec2 right = texture(xTexture, rightNeighbor).xy;
            vec2 bottom = texture(xTexture, bottomNeighbor).xy;
            vec2 left = texture(xTexture, leftNeighbor).xy;
            vec2 b = texture(bTexture, texCoord).xy;
            xNew = vec4((top + right + bottom + left + alpha * b) * rBeta, 0.0, 1.0);
        } else {
            xNew = texture(xTexture, texCoord);
        }
    }
}
`