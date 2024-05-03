/**
 * The main simulation logic.
 */

const canvas = document.getElementById('waves') as HTMLCanvasElement
if (!canvas) {
    throw new Error('No canvas found')
}
const gl = canvas.getContext('webgl2')
if (!gl) {
    throw new Error('WebGL2 not supported')
}

