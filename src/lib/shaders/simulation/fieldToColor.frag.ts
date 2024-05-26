/** 
 * A shader which takes a field and outputs
 * pretty colors.
 */
export const fieldToColorFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D field;
uniform float colorMode;

out vec4 color;

// Color the velocity field based on the magnitude (absolute value) of the velocity.
void main() {
    vec4 v = texture(field, texCoord);
    float speed = length(v.xy);

    if (colorMode == 0.0) {
        // rainbow
        float blue = max(-v.x, -v.y);
        blue = max(blue, 0.0) * 3.0;
        color = vec4(abs(v.xy) * 3.0, blue, 1.0);
    } else if (colorMode == 1.0) {
        // black and white
        color = vec4(speed * 2.0, speed * 2.0, speed * 2.0, 1.0);
    } else if (colorMode == 2.0) {
        // blue-green
        color = vec4(0.0, abs(v.y), abs(v.x), 1.0);
    } else if (colorMode == 3.0) {
        // pink with black/dark 
        float r = 1.0 - speed;
        float b = 1.0 - speed * 2.0;
        color = vec4(r, 0.0, b, 1.0);
    }
}
`;