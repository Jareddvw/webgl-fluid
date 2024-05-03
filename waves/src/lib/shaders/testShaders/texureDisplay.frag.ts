// Passthrough fragment shader that takes a texture coordinate and samples a texture
export const textureDisplayFrag = /*glsl*/ `#version 300 es

precision highp float;

in vec2 fragTexCoord;
uniform sampler2D tex;
out vec4 fragColor;

void main() {
    vec4 colorAtPoint = texture(tex, fragTexCoord);
    // if (colorAtPoint.x == 0.0 && colorAtPoint.y == 0.0 && colorAtPoint.z == 0.0) {
    //     fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    // } else {
    //     fragColor = colorAtPoint;
    // }
    fragColor = colorAtPoint;
}
`