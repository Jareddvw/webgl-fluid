// takes a particle position and draws it on the screen, 
// uses the velocity texture to change its color
export const particlesFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 texCoord;
in float indexOut;

uniform sampler2D velocityTexture;

out vec4 fragColor;

// assign a random color based on the position
float random(vec2 coords) {
    return fract(sin(dot(coords, vec2(12.9898, 78.233))) * 43758.5453);
}

// Color the particle based on the velocity at its position.
void main() {
    vec2 velocity = texture(velocityTexture, texCoord).xy;
    
    // Color the particle based on the velocity.
    // float blue = max(-velocity.x, -velocity.y);
    // blue = max(blue, 0.0);
    // fragColor = vec4(abs(velocity.xy), blue, 1.0);

    // make particles a random color
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;