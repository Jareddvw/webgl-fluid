export const advectFrag = /* glsl */ `#version 300 es

precision highp float;

in vec2 texCoord;

uniform sampler2D velocity;
uniform sampler2D quantity; // quantity to advect (can be velocity)
uniform float dt;
uniform float gridScale; // Grid scale
uniform vec2 texelDims; // 1 / texture dimensions
uniform float aspectRatio; // texelDims.x / texelDims.y
uniform bool useBilerp;
uniform float dissipation;

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

// q(x, t + dt) = q(x - u(x, t) * dt, t)
void main() {
    vec2 coords = texCoord.xy;

    // Get the velocity at the current position, u(x, t)
    vec2 u = texture(velocity, coords).xy;
    u.x /= aspectRatio;

    // Combine for x - u(x, t) * dt
    vec2 newPos = coords - u * dt * (1.0 / gridScale);

    if (useBilerp) {
        // return q(x - u(x, t) * dt, t)
        fragColor = bilerp(quantity, newPos) * (1.0 - dissipation);
        return;
    }
    // Without bilerp the advection isn't as smooth but the choppiness looks cool
    fragColor = texture(quantity, newPos) * (1.0 - dissipation);
}
`