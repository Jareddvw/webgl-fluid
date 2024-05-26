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

uniform float regenerateParticles; // whether to randomly reset particles

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
    vec2 newPos = q.xy + v.xy * dt * (1.0 / gridScale);

    if (
        regenerateParticles == 1.0 && 
        random((newPos + texCoord.xy + v + q) * dt) < 0.00000001
    ) {
        // Reset the particle to its original position
        newPos = texCoord.xy;
    }

    // Make sure we don't lose particles
    if (newPos.x < 0.0) {
        newPos.x = 2.0 * texelDims.x;
    }
    if (newPos.x > 1.0) {
        newPos.x = 1.0 - (2.0 * texelDims.x);
    }
    if (newPos.y < 0.0) {
        newPos.y = 2.0 * texelDims.y;
    }
    if (newPos.y > 1.0) {
        newPos.y = 1.0 - (2.0 * texelDims.y);
    }
    fragColor = vec4(newPos, 0.0, 1.0);
}`