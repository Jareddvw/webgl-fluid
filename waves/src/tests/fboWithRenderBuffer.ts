/** 
 * A test to see if we can render to a render buffer, then render that to a texture,
 * then render that texture to the screen.
 */
import { RenderBufferFBO } from '../lib/classes/RenderBufferFBO'
import { Shader } from '../lib/classes/Shader'
import { ShaderProgram } from '../lib/classes/ShaderProgram'
import { TextureFBO } from '../lib/classes/TextureFBO'
import { fillColorFrag } from '../lib/shaders/testShaders/fillColor.frag'
import { passThroughVert } from '../lib/shaders/testShaders/passThrough.vert'
import { textureDisplayVert } from '../lib/shaders/testShaders/textureDisplay.vert'
import { textureDisplayFrag } from '../lib/shaders/testShaders/texureDisplay.frag'
import { draw } from '../lib/utils'
import '../style.css'


const canvas = document.getElementById('waves') as HTMLCanvasElement
if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}

// create a simple triangle to render to the FBO
const renderBufferFBO = new RenderBufferFBO(gl, gl.canvas.width, gl.canvas.height)
renderBufferFBO.bind()
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)

const passThrough = new Shader(gl, gl.VERTEX_SHADER, passThroughVert)
const fillColor = new Shader(gl, gl.FRAGMENT_SHADER, fillColorFrag)
const fillColorProgram = new ShaderProgram(gl, [passThrough, fillColor])
fillColorProgram.use()
// make the triangle purple
gl.uniform4fv(fillColorProgram.uniforms.color, [0.6, 0.1, 0.4, 1.0])

const vertices = new Float32Array([
    -1, -1,
    0, 1,
    1, -1,
])
const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
const positionAttributeLocation = gl.getAttribLocation(fillColorProgram.getProgram(), 'position')
gl.enableVertexAttribArray(positionAttributeLocation)

gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0)
gl.drawArrays(gl.TRIANGLES, 0, 3)

renderBufferFBO.unbind()

// now create a quad to render the texture to, then render that to the screen
const textureVertShader = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
const textureFragShader = new Shader(gl, gl.FRAGMENT_SHADER, textureDisplayFrag)
const textureProgram = new ShaderProgram(gl, [textureVertShader, textureFragShader])
textureProgram.use()

const finalFBO = new TextureFBO(gl, gl.canvas.width, gl.canvas.height)
finalFBO.bind()
gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderBufferFBO.framebuffer)
gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, finalFBO.framebuffer)
gl.blitFramebuffer(0, 0, gl.canvas.width, gl.canvas.height, 0, 0, gl.canvas.width, gl.canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR)
gl.bindFramebuffer(gl.FRAMEBUFFER, null)

// now render the texture to the screen
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.clear(gl.COLOR_BUFFER_BIT)

// use the texture from the final FBO to render to the screen
gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, finalFBO.texture)
gl.uniform1i(textureProgram.uniforms.texture, 0)

draw(gl, null)