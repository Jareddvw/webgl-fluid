import { SimulationSettings, VisField } from "../lib/utils/types";
import { clamp } from "../lib/utils/utils";

const canvas = document.getElementById('waves') as HTMLCanvasElement;
canvas.width = canvas.getBoundingClientRect().width
canvas.height = canvas.getBoundingClientRect().height

const offscreenCanvas = canvas.transferControlToOffscreen();
offscreenCanvas.width = canvas.width
offscreenCanvas.height = canvas.height
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

// Pass the canvas and control over it to the worker
worker.postMessage({ canvas: offscreenCanvas }, [offscreenCanvas]);

// When the worker responds, draw the image to the canvas
worker.onmessage = (e: MessageEvent) => {
    const imageBitmap = e.data as ImageBitmap;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(imageBitmap, 0, 0);
    }
};

const selectedField = document.getElementById('field') as HTMLSelectElement
const particleLinesCheckbox = document.getElementById('particleLines') as HTMLInputElement
const bilerpCheckbox = document.getElementById('bilerp') as HTMLInputElement
const pauseCheckbox = document.getElementById('pause') as HTMLInputElement
const particleDensityInput = document.getElementById('particleDensity') as HTMLInputElement
const particleTrailSizeInput = document.getElementById('particleTrailSize') as HTMLInputElement
const pointSizeInput = document.getElementById('pointSize') as HTMLInputElement
const colorModeInput = document.getElementById('colorMode') as HTMLInputElement

const settings: SimulationSettings = {
    visField: selectedField.value as VisField,
    jacobiIterations: 30,
    manualBilerp: bilerpCheckbox.checked,

    colorMode: parseInt(colorModeInput.value, 10),
    particleDensity: parseFloat(particleDensityInput.value) / 100.0,
    showParticleTrails: particleLinesCheckbox.checked,
    particleTrailSize: parseFloat(particleTrailSizeInput.value) / 100.0,
    particleSize: clamp(parseFloat(pointSizeInput.value), 1, 5),
    advectBackward: false,
    paused: pauseCheckbox.checked,

    impulseDirection: [0, 0],
    impulsePosition: [0, 0],
    impulseRadius: 0,
    impulseMagnitude: 0,
}
const updateWorkerSettings = () => {
    console.log('updating worker settings')
    worker.postMessage({ settings });
}
updateWorkerSettings()

particleDensityInput.addEventListener('change', () => {
    settings.particleDensity = parseFloat(particleDensityInput.value) / 100.0
    updateWorkerSettings()
})
particleTrailSizeInput.addEventListener('change', () => {
    settings.particleTrailSize = parseFloat(particleTrailSizeInput.value) / 100.0
    updateWorkerSettings()
})
pointSizeInput.addEventListener('change', () => {
    settings.particleSize = clamp(parseFloat(pointSizeInput.value), 1, 5)
    updateWorkerSettings()
})
colorModeInput.addEventListener('change', () => {
    settings.colorMode = clamp(parseInt(colorModeInput.value, 10), 1, 5)
    updateWorkerSettings()
})
pauseCheckbox.addEventListener('change', () => {
    if (pauseCheckbox.checked) {
        settings.paused = true
    } else {
        settings.paused = false
    }
    updateWorkerSettings()
})
selectedField.addEventListener('change', () => {
    settings.visField = selectedField.value as VisField
    updateWorkerSettings()
})
particleLinesCheckbox.addEventListener('change', () => {
    if (particleLinesCheckbox.checked) {
        settings.showParticleTrails = true
    } else {
        settings.showParticleTrails = false
    }
    updateWorkerSettings()
})
let mouseDown = false
let lastMousePos = [0, 0]
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX / canvas.width
    const y = 1 - e.clientY / canvas.height
    mouseDown = true
    lastMousePos = [x, y]
    updateWorkerSettings()
})
canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const x = e.clientX / canvas.width
        const y = 1 - e.clientY / canvas.height
        const diff = [x - lastMousePos[0], y - lastMousePos[1]]
        // force direction is the direction of the mouse movement
        // normalize diff for direction
        const len = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1])
        const normalizedDiff = (len === 0 || len < 0.002) ? [0, 0] : [diff[0] / len, diff[1] / len]
        settings.impulseDirection = normalizedDiff as [number, number]
        lastMousePos =  [x, y]
        settings.impulsePosition = [x, y]
        settings.impulseMagnitude = 1
        settings.impulseRadius = .0001
        updateWorkerSettings()
    }
})
canvas.addEventListener('mouseup', () => {
    mouseDown = false
    settings.impulseMagnitude = 0
    settings.impulseRadius = 0
    settings.impulseDirection = [0, 0]
    updateWorkerSettings()
})
