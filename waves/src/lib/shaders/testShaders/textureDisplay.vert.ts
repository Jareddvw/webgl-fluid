export const textureDisplayVert = /*glsl*/ `#version 300 es

in vec2 position;

// pass the texture coordinates to the fragment shader
out vec2 fragTexCoord;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    fragTexCoord = position * 0.5 + 0.5;
}
`