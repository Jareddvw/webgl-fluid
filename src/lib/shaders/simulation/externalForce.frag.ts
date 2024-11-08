// A shader that takes a texture and adds an external force to it.
// Adds a gaussian splat to the position of the impulse.
export const externalForceFrag = /*glsl*/ `#version 300 es

precision highp float;
precision highp sampler2D;

#define MAX_FORCES 100

in vec2 texCoord;

uniform vec2 impulseDirections[MAX_FORCES];
uniform vec2 impulsePositions[MAX_FORCES];
uniform float impulseMagnitudes[MAX_FORCES];
uniform float impulseRadii[MAX_FORCES];
uniform int impulseCount;

uniform float aspectRatio;
uniform sampler2D velocityTexture;

out vec4 color;

// c = Fdt * exp(-(distance_from_impulse^2) / r)
// v += c
void main() {
    vec2 fragPos = texCoord;
    
    // at each impulse position, add a gaussian splat to the velocity field
    vec2 newVelocity = texture(velocityTexture, fragPos).xy;
    for (int i = 0; i < impulseCount; i++) {
        vec2 diff = impulsePositions[i] - fragPos;
        diff.y /= aspectRatio;
        float r = impulseRadii[i];
        float c = impulseMagnitudes[i] * exp(-dot(diff, diff) / r);
        newVelocity += vec2(impulseDirections[i].xy) * c;
    }

    color = vec4(newVelocity, 0.0, 1.0);
}`

