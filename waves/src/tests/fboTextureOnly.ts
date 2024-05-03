/** 
 * A test to see if we can render to a texture, then render that texture to the screen
 */
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
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}

// create a simple triangle to render to the FBO
const fbo = new TextureFBO(gl, gl.canvas.width, gl.canvas.height)
fbo.bind()
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

fbo.unbind()

// now create a quad to render the texture to, then render that to the screen
const textureVertShader = new Shader(gl, gl.VERTEX_SHADER, textureDisplayVert)
const textureFragShader = new Shader(gl, gl.FRAGMENT_SHADER, textureDisplayFrag)
const textureProgram = new ShaderProgram(gl, [textureVertShader, textureFragShader])
textureProgram.use()

gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, fbo.texture)
gl.uniform1i(textureProgram.uniforms.texture, 0)

draw(gl, null)