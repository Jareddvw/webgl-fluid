// boundary condition fragment shader
export const boundaryCondFrag = /* glsl */ `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 texCoord;

uniform sampler2D x;
uniform float scale;
uniform vec2 texelDims;

out vec4 color;

vec4 boundary(vec2 coords, vec2 offset, float scale, sampler2D x) {
    return scale * texture(x, coords + offset * texelDims);
}

void main() {
    vec2 coords = texCoord;

    // color = vec4(1.0, 1.0, 1.0, 1.0);
    if (coords.x < texelDims.x) {
        color = boundary(coords, vec2(1.0, 0.0), scale, x);
    } else if (coords.x > 1.0 - texelDims.x) {
        color = boundary(coords, vec2(-1.0, 0.0), scale, x);
    } else if (coords.y < texelDims.y) {
        color = boundary(coords, vec2(0.0, 1.0), scale, x);
    } else if (coords.y > 1.0 - texelDims.y) {
        color = boundary(coords, vec2(0.0, -1.0), scale, x);
    } else {
        color = texture(x, coords);
    }
}
`;