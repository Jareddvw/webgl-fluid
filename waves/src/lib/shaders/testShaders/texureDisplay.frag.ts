export const textureDisplayFrag = /*glsl*/ `#version 300 es

precision highp float;

in vec2 fragTexCoord;
uniform sampler2D tex;
out vec4 fragColor;

void main() {
    fragColor = texture(tex, fragTexCoord);
}
`