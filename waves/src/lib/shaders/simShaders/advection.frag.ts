export const advectFrag = /* glsl */ `#version 300 es

precision highp float;

uniform sampler2D velocity; // Input velocity field
uniform sampler2D quantity; // Input quantity to advect
uniform float dt; // Time step
uniform float gridScale; // Grid scale
uniform vec2 texelDims; // 1 / texture dimensions

out vec4 fragColor;

// We store negative values in the z and w channels of the velocity field,
// so anytime we read the velocity field, we need to decode it first
vec2 decodeVelocity(vec4 velocity) {
    vec2 positiveVelocity = velocity.xy;
    vec2 negativeVelocity = velocity.zw;
    return positiveVelocity - negativeVelocity;
}

void main() {
    vec2 coords = gl_FragCoord.xy * texelDims;   // Texture coordinates

    // Get the velocity at the current position
    vec4 velocityValue = texture(velocity, coords);
    vec2 velocity = decodeVelocity(velocityValue);

    vec2 delta = dt * velocity * gridScale;
    
    // Backtrace the position
    vec2 backtracePos = coords - dt * velocity * gridScale;

    // Get the quantity at the backtraced position
    vec4 quantityValue = texture(quantity, backtracePos);

    // Write the quantity to the current position
    fragColor = quantityValue;
}
`