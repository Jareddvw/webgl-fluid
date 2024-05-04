/** A shader which takes a velocity field and outputs
 * pretty colors. blue is negative, red is positive.
 */
export const velocityToColorFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D velocityTexture;

out vec4 color;


// We store negative values in the z and w channels of the velocity field,
// so anytime we read the velocity field, we need to decode it first
vec2 decodeVelocity(vec4 velocity) {
    vec2 positiveVelocity = velocity.xy;
    vec2 negativeVelocity = velocity.zw;
    return positiveVelocity - negativeVelocity;
}

// Color the velocity field based on the magnitude (absolute value) of the velocity.
// blue is zero, red is max velocity.
void main() {
    vec4 velocity = texture(velocityTexture, texCoord);
    
    // velocity is stored in the xy channels, negative velocity is stored in the zw channels.
    vec2 v = decodeVelocity(velocity);
    
    color = vec4(abs(v), 0.0, 1.0);
}
`;