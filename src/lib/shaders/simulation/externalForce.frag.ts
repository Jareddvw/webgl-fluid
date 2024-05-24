// A shader that takes a texture and adds an external force to it.
// Adds a gaussian splat to the position of the impulse.
export const externalForceFrag = /*glsl*/ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform vec2 impulseDirection;
uniform vec2 impulsePosition;
uniform float impulseRadius;
uniform float impulseMagnitude;
uniform float aspectRatio;
uniform sampler2D velocityTexture;

out vec4 color;

// c = Fdt * exp(-(distance_from_impulse^2) / r)
// v += c
void main() {
    vec2 fragPos = texCoord;
    
    vec2 diff = impulsePosition - fragPos;
    diff.y /= aspectRatio;
    vec2 c = exp(-dot(diff, diff) / impulseRadius) * vec2(impulseDirection.xy) * impulseMagnitude;

    vec2 velocity = texture(velocityTexture, fragPos).xy;
    vec2 newVelocity = velocity + c;

    color = vec4(newVelocity, 0.0, 1.0);
}`

