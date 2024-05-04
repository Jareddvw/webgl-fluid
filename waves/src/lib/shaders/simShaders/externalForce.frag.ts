// A shader that takes a texture and adds an external force to it.
// Adds a gaussian splat to the position of the impulse.
export const externalForceFrag = /*glsl*/ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform vec2 force;
uniform vec2 impulsePosition;
uniform float impulseRadius;
uniform float impulseMagnitude;
uniform float aspectRatio;
// Input velocity texture
uniform sampler2D velocityTexture;

out vec4 color;

// We store negative values in the z and w channels of the velocity field,
// so anytime we read the velocity field, we need to decode it first
vec2 decodeVelocity(vec4 velocity) {
    vec2 positiveVelocity = velocity.xy;
    vec2 negativeVelocity = velocity.zw;
    return positiveVelocity - negativeVelocity;
}

void main() {
    vec2 fragPos = texCoord;
    
    vec2 diff = impulsePosition - fragPos;
    diff.y /= aspectRatio;
    vec2 c = exp(-dot(diff, diff) / impulseRadius) * vec2(force.xy) * impulseMagnitude;

    vec4 velocity = texture(velocityTexture, fragPos);

    // now c is the force to apply to the velocity field. We store negative x and y
    // in the z and w channels of the velocity field.
    // First add the force to the velocity field
    vec2 newVelocity = decodeVelocity(velocity) + c;

    // if x or y is negative, store the negative value in the z or w channel
    // of the velocity field.
    // if x is negative, store -x in z channel
    // if y is negative, store -y in w channel
    vec2 negativeVelocity = vec2(0.0, 0.0);
    if (newVelocity.x < 0.0) {
        negativeVelocity.x = -newVelocity.x;
        newVelocity.x = 0.0;
    }
    if (newVelocity.y < 0.0) {
        negativeVelocity.y = -newVelocity.y;
        newVelocity.y = 0.0;
    }

    // store the negative values in the z and w channels
    vec4 newVelocityWithNegatives = vec4(newVelocity, negativeVelocity);
    color = newVelocityWithNegatives;
}`

