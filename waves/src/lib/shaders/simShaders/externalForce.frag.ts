// A shader that takes a texture and adds an external force to it.
// Adds a gaussian splat to the position of the impulse.
export const externalForceFrag = /*glsl*/ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform vec2 impulsePosition;
uniform float impulseRadius;
uniform float impulseMagnitude;
uniform float aspectRatio;
// Input velocity texture
uniform sampler2D velocityTexture;

out vec4 color;

void main() {
    vec2 fragPos = texCoord;
    
    vec2 diff = impulsePosition - fragPos;
    diff.y /= aspectRatio;
    vec2 c = exp(-dot(diff, diff) / impulseRadius) * impulsePosition;
    vec3 velocity = texture(velocityTexture, fragPos).xyz;

    color = vec4(velocity.xy + c, velocity.z, 1.0);
}`

