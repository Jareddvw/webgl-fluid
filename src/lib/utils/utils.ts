
export const getFpsCallback = () => {
    let lastCalledTime = 0
    let totalFrameTimes = 0
    const deltaArray: number[] = []
    const getFPS = () => {
        // use a sliding window to calculate the average fps over the last 60 frames
        const now = performance.now()
        const delta = now - lastCalledTime
        lastCalledTime = now
        deltaArray.push(delta)
        totalFrameTimes += delta
        if (deltaArray.length > 60) {
            totalFrameTimes -= deltaArray.shift() as number
        }
        return 1000 / (totalFrameTimes / deltaArray.length)
    }
    return getFPS
}

export const colors = {
    black: [0.0, 0.0, 0.0, 1.0],
    empty: [0.0, 0.0, 0.0, 0.0],
    white: [1.0, 1.0, 1.0, 1.0],
    purple: [0.6, 0.1, 0.4, 1.0],
    pink: [1.0, 0.0, 1.0, 1.0],
    deepNavy: [0.039, 0.098, 0.196, 1.0], // New color for silk mode
}

export const clamp = (val: number, min: number, max: number) => {
    return Math.min(Math.max(val, min), max)
}

/** Generates a texture that's gl.canvas.width x gl.canvas.height and contains the given image */
export const makeTextureFromImage = (gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture => {
    const texture = gl.createTexture()
    if (!texture) {
        throw new Error('Could not create texture')
    }
    // flip image horizontally
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return texture
}