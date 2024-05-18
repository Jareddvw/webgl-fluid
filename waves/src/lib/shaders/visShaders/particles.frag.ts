// takes a particle position and draws it on the screen, 
// uses the velocity texture to change its color
export const particlesFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in float indexOut;

uniform sampler2D velocityTexture;
uniform vec2 canvasSize;
// which colors to use
uniform float colorMode;

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
    vec2 velocity = texture(velocityTexture, texCoord).xy;
    if (colorMode == 0.0) {
        // colors are based on velocity at the texCoord
        float blue = max(-velocity.x, -velocity.y);
        blue = max(blue * 2.0, 0.0);
        fragColor = vec4(min(abs(velocity.xy) * 2.0, 1.0), blue, 1.0);
    } else if (colorMode == 1.0) {
        // black and white
        float speed = length(velocity);
        float maxSpeed = 1.0;
        float minSpeed = 0.0;
        float normalizedSpeed = (speed - minSpeed) / (maxSpeed - minSpeed);
        vec3 color = vec3(normalizedSpeed, normalizedSpeed, normalizedSpeed);
        fragColor = vec4(color, 1.0);
    } else if (colorMode == 2.0) {
        // color based on initial position
        vec2 initialPos = decode(indexOut, canvasSize);
        float blue = length(initialPos - vec2(1.0, 1.0));
        blue = max(blue, 0.0);
        fragColor = vec4(abs(initialPos.xy), blue, 1.0);
    } else if (colorMode == 3.0) {
        // no red, just green and blue
        vec2 initialPos = decode(indexOut, canvasSize);
        vec2 gb = abs(initialPos.xy);
        fragColor = vec4(0.0, gb, 1.0);
    } else if (colorMode == 4.0) {
        // all yellow
        fragColor = vec4(1.0, 1.0, 0.0, 1.0);
    } else if (colorMode == 5.0) {
        // blue, green, and yellow
        vec2 initialPos = decode(indexOut, canvasSize);
        vec2 gb = abs(initialPos.xy);
        float r = 1.0 - gb.x;
        fragColor = vec4(r, gb, 1.0);
    }
}
`;