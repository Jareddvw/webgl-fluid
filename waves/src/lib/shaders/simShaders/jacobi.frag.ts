/** Shader for n iterations of the Jacobi method */
export const jacobiFrag = /* glsl */ `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 topNeighbor;
in vec2 rightNeighbor;
in vec2 bottomNeighbor;
in vec2 leftNeighbor;

uniform float alpha;       
uniform float rBeta;       // reciprocal beta

uniform sampler2D xTexture;   // x vector (Ax = b)
uniform sampler2D bTexture;   // b vector (Ax = b)

out vec4 xNew;             // Result

void main() {
    // neighbors
    vec2 top = texture(xTexture, topNeighbor).xy;
    vec2 right = texture(xTexture, rightNeighbor).xy;
    vec2 bottom = texture(xTexture, bottomNeighbor).xy;
    vec2 left = texture(xTexture, leftNeighbor).xy;

    // b vector
    vec2 b = texture(bTexture, texCoord).xy;

    // Jacobi method
    xNew = vec4((top + right + bottom + left + alpha * b) * rBeta, 0.0, 1.0);
}
`

// // Copy the velocity texture to a temp texture so we can use it as the b texture in the jacobi method
// copyProgram.use()
// gl.activeTexture(gl.TEXTURE0)
// gl.bindTexture(gl.TEXTURE_2D, inputFBO.texture)
// gl.uniform1i(copyProgram.uniforms.source, 0)
// draw(gl, tempFBO.getWriteFBO())
// tempFBO.swap()
// const bTexture = inputFBO.texture

// // Solve for viscous diffusion with jacobi method
// let jacobiInputFBO = externalForceFBO.getReadFBO()
// jacobiProgram.use()
// // There's a weird bug here. If I just use alpha = (gridScale * gridScale) / (DIFFUSION_COEFFICIENT * deltaT)
// // then the simulation doesn't work. If I flip it so we use the reciprocal then it works. Idk why...
// const rAlpha = DIFFUSION_COEFFICIENT * deltaT / (gridScale * gridScale)
// // console.log('rAlpha', rAlpha, 'alpha', 1 / rAlpha)
// const alpha = (gridScale * gridScale) / (DIFFUSION_COEFFICIENT * deltaT)
// const rBeta = 1 / (4 + rAlpha)
// gl.uniform1f(jacobiProgram.uniforms.alpha, rAlpha)
// gl.uniform1f(jacobiProgram.uniforms.rBeta, rBeta)
// gl.activeTexture(gl.TEXTURE0)
// gl.bindTexture(gl.TEXTURE_2D, bTexture)
// gl.uniform1i(jacobiProgram.uniforms.bTexture, 0)

// // solve for diffusion
// for (let i = 0; i < 30; i++) {
//     gl.activeTexture(gl.TEXTURE1)
//     gl.bindTexture(gl.TEXTURE_2D, jacobiInputFBO.texture)
//     gl.uniform1i(jacobiProgram.uniforms.xTexture, 1)

//     draw(gl, jacobiFBO.getWriteFBO())
//     jacobiFBO.swap()
//     jacobiInputFBO = jacobiFBO.getReadFBO()
// }
// inputFBO = jacobiFBO.getReadFBO()