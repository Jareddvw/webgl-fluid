// advection shader for particles. For field advection we use 
// backwards advection, but for particles we use forwards advection.
export const advectParticleFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D velocity;
uniform sampler2D quantity;
uniform float dt;
uniform float gridScale; // Grid scale
uniform vec2 texelDims; // 1 / texture dimensions

out vec4 fragColor;

float random(vec2 coords) {
    return fract(sin(dot(coords, vec2(12.9898, 78.233))) * 43758.5453);
}

// q(x, t + dt) = q(x + u(x, t) * dt, t)
void main() {
    vec2 coords = texCoord.xy;

    // Get the actual position of the point
    vec2 q = texture(quantity, coords).xy;

    // Get the velocity at the current position, u(x, t)
    vec2 v = texture(velocity, q).xy;
    
    // Combine for q(x + u(x, t) * dt, t)
    vec2 newPos = q.xy + v.xy * dt * gridScale;

    if (random((newPos + texCoord.xy + v + q) * dt) < 0.0001) {
        // Reset the particle to its original position
        newPos = texCoord.xy;
    }
    fragColor = vec4(newPos, 0.0, 1.0);
}`