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
uniform bool useBilerp;
uniform vec2 texelDims; // 1 / texture dimensions

out vec4 fragColor;

vec4 bilerp(sampler2D tex, vec2 coords) {
    vec2 st = coords / texelDims - 0.5;

    vec2 base = floor(st);
    vec2 fuv = st - base;

    vec4 bl = texture(tex, (base + vec2(0.5, 0.5)) * texelDims);
    vec4 br = texture(tex, (base + vec2(1.5, 0.5)) * texelDims);
    vec4 tl = texture(tex, (base + vec2(0.5, 1.5)) * texelDims);
    vec4 tr = texture(tex, (base + vec2(1.5, 1.5)) * texelDims);

    return mix(mix(bl, br, fuv.x), mix(tl, tr, fuv.x), fuv.y);
}

// q(x, t + dt) = q(x + u(x, t) * dt, t)
void main() {
    vec2 coords = texCoord.xy;

    // Get the velocity at the current position, u(x, t)
    vec4 v = texture(velocity, coords);
    
    // Combine for q(x + u(x, t) * dt, t)
    vec2 newPos = coords + v.xy * dt * gridScale;

    if (useBilerp) {
        fragColor = vec4(bilerp(quantity, newPos).xy, 0.0, 1.0);
        return;
    }
    fragColor = vec4(newPos, 0.0, 1.0);
}`