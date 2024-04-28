export const advectFrag = /* glsl */ `#version 300 es

uniform sampler2D velocity; // Input velocity field
uniform sampler2D quantity; // Input quantity to advect
uniform float dt; // Time step
uniform float rdx; // 1 / grid scale
uniform vec2 resolution; // grid resolution

out vec4 fragColor;

void main() {
    vec2 coords = gl_FragCoord.xy / resolution;

    // follow velocity field backwards
    vec2 velocity = texture(velocity, coords).xy;
    vec2 position = coords - dt * velocity * rdx;

    // Interpolate
    fragColor = texture(quantity, position);
}
`