// boundary condition fragment shader
export const boundaryCondFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D x;
uniform float scale;
uniform vec2 texelDims;
// the distance from the edges to apply the boundary condition
uniform float threshold;

out vec4 color;

vec4 boundary(vec2 coords, vec2 offset, float scale, sampler2D x) {
    return scale * texture(x, coords + offset * texelDims);
}

void main() {
    vec2 coords = texCoord;
    
    // boundary conditions
    // TODO: make this less hacky and so that it works for real...
    if (coords.x <= threshold) {
        color = boundary(coords, vec2(1.0, 0.0), scale, x);
        // if (coords.x < threshold) {
        //     color = vec4(0.0);
        // }
    } else if (coords.x >= 1.0 - threshold) {
        color = boundary(coords, vec2(-1.0, 0.0), scale, x);
        // if (coords.x > 1.0 - threshold) {
        //     color = vec4(0.0);
        // }
    } else if (coords.y <= threshold) {
        color = boundary(coords, vec2(0.0, 1.0), scale, x);
        // if (coords.y < threshold) {
        //     color = vec4(0.0);
        // }
    } else if (coords.y >= 1.0 - threshold) {
        color = boundary(coords, vec2(0.0, -1.0), scale, x);
        // if (coords.y > 1.0 - threshold) {
        //     color = vec4(0.0);
        // }
    } else {
        color = texture(x, coords);
    }
    // color = texture(x, texCoord);
}
`;