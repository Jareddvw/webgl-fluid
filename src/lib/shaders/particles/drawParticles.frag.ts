/**
 * Takes a particle index, draws it based on its position in the texture
 * or its initial position, colors it based on the colorMode.
 */
export const drawParticleFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in float indexOut;

uniform vec2 canvasSize;
uniform float colorMode;
uniform sampler2D image;

out vec4 fragColor;

// given an index and the canvas width and height, 
// return the xy position of the particle
vec2 decode(float index, vec2 canvasSize) {
    vec2 texelSize = 1.0 / canvasSize;
    float y = floor(index / canvasSize.x);
    float x = mod(index, canvasSize.x);
    return vec2(x, y) * texelSize + texelSize * 0.5;
}

// Color the particle based on the velocity at its position.
void main() {
    if (colorMode == 5.0) {
        vec2 initialPos = decode(indexOut, canvasSize);
        fragColor = texture(image, initialPos);
        return;
    }

    if (colorMode == 0.0) {
        // rainbow
        vec2 initialPos = decode(indexOut, canvasSize);
        float blue = length(initialPos - vec2(1.0, 1.0));
        blue = max(blue, 0.0);
        fragColor = vec4(abs(initialPos.xy), blue, 1.0);
    } else if (colorMode == 1.0) {
        // black and white
        fragColor = vec4(1.0);
    } else if (colorMode == 2.0) {
        // blue-green
        vec2 initialPos = decode(indexOut, canvasSize);
        vec2 gb = abs(initialPos.xy);
        fragColor = vec4(0.0, gb, 1.0);
    } else if (colorMode == 3.0) {
        fragColor = vec4(0.3, 0.3, 0.3, 1.0);
    }
}
`;