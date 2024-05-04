// takes a particle position and draws it on the screen, 
// uses the velocity texture to change its color
export const particlesFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D velocityTexture;

out vec4 fragColor;

// Color the particle based on the velocity at its position.
void main() {
    vec2 velocity = texture(velocityTexture, texCoord).xy;
    
    // Color the particle based on the velocity.
    float blue = max(-velocity.x, -velocity.y);
    blue = max(blue, 0.0);
    fragColor = vec4(abs(velocity.xy), blue, 1.0);
}
`;