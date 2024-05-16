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
    
    // Color the particle based on the velocity. If 
    // the particle isn't moving, it should be white.
    // float speed = length(velocity);
    // float maxSpeed = 1.0;
    // float minSpeed = 0.0;
    // float normalizedSpeed = (speed - minSpeed) / (maxSpeed - minSpeed);
    // vec3 color = vec3(normalizedSpeed, normalizedSpeed, normalizedSpeed);
    // fragColor = vec4(color, 1.0);




    float blue = max(-velocity.x, -velocity.y);
    blue = max(blue * 2.0, 0.0);
    fragColor = vec4(min(abs(velocity.xy) * 2.0, 1.0), blue, 1.0);
}
`;