/** 
 * This file handles the dom elements for controlling the simulation.
 * It creates a SimulationSettings object and updates it based on user input.
 */

import { SimulationSettings, VisField } from "./lib/utils/types"
import { clamp } from "./lib/utils/utils"
import "./style.css"

const canvas = document.getElementById('waves') as HTMLCanvasElement

const selectedField = document.getElementById('field') as HTMLSelectElement
const bilerpCheckbox = document.getElementById('bilerp') as HTMLInputElement
const pauseCheckbox = document.getElementById('pause') as HTMLInputElement
const particleLinesCheckbox = document.getElementById('particleLines') as HTMLInputElement
const backwardsAdvectionCheckbox = document.getElementById('advectBackwards') as HTMLInputElement
const particleDensityInput = document.getElementById('particleDensity') as HTMLInputElement
const particleTrailSizeInput = document.getElementById('particleTrailSize') as HTMLInputElement
const pointSizeInput = document.getElementById('pointSize') as HTMLInputElement
const colorModeInput = document.getElementById('colorMode') as HTMLInputElement
const resetButton = document.getElementById('reset') as HTMLButtonElement
const haltButton = document.getElementById('halt') as HTMLButtonElement
const imageUpload = document.getElementById('imageUpload') as HTMLInputElement

/**
 * The simulation settings.
 */
const settings: SimulationSettings = {
    visField: selectedField.value as VisField,
    jacobiIterations: 25,
    gridScale: 1,
    manualBilerp: bilerpCheckbox?.checked ?? true,

    applyDiffusion: false,
    diffusionCoefficient: 1,

    advectionDissipation: 0.001,
    
    particleDensity: parseFloat(particleDensityInput.value) / 100.0,
    showParticleTrails: particleLinesCheckbox.checked,
    advectBackward: backwardsAdvectionCheckbox.checked,
    particleTrailSize: parseFloat(particleTrailSizeInput.value) / 100.0,
    particleSize: clamp(parseFloat(pointSizeInput.value), 1, 5),

    impulseDirection: [0, 0],
    impulsePosition: [0, 0],
    impulseRadius: 0,
    impulseMagnitude: 0,

    addDye: false,
    image: null,

    colorMode: parseInt(colorModeInput.value, 10),
    paused: pauseCheckbox.checked,
    reset: false,
    halt: false,
}

const hideElem = (element: HTMLElement) => {
    element.classList.add('hidden')
}
const showElem = (element: HTMLElement) => {
    element.classList.remove('hidden')
}

const showOrHideElementsByClassname = (className: string, show: boolean) => {
    const elems = document.getElementsByClassName(className)
    for (let i = 0; i < elems.length; i += 1) {
        const elem = elems[i] as HTMLElement
        if (show) {
            showElem(elem)
        } else {
            hideElem(elem)
        }
    }
}

const showOrHideTrailsInput = () => {
    if (particleLinesCheckbox.checked && selectedField.value === 'particles') {
        showOrHideElementsByClassname('trails', true)
    } else {
        showOrHideElementsByClassname('trails', false)
    }
}
showOrHideTrailsInput()

const showOrHideParticleInput = () => {
    if (selectedField.value === 'particles') {
        showOrHideElementsByClassname('particles', true)
    } else {
        showOrHideElementsByClassname('particles', false)
    }
    showOrHideTrailsInput()
}
showOrHideParticleInput()

resetButton.addEventListener('click', () => {
    settings.reset = true
})
haltButton.addEventListener('click', () => {
    settings.halt = true
})
backwardsAdvectionCheckbox.addEventListener('change', () => {
    settings.advectBackward = backwardsAdvectionCheckbox.checked
})
particleDensityInput.addEventListener('change', () => {
    settings.particleDensity = parseFloat(particleDensityInput.value) / 100.0
})
particleTrailSizeInput.addEventListener('change', () => {
    settings.particleTrailSize = parseFloat(particleTrailSizeInput.value) / 100.0
})
pointSizeInput.addEventListener('change', () => {
    settings.particleSize = clamp(parseFloat(pointSizeInput.value), 1, 5)
})
colorModeInput.addEventListener('change', () => {
    settings.colorMode = clamp(parseInt(colorModeInput.value, 10), 0, 3)
})
pauseCheckbox.addEventListener('change', () => {
    if (pauseCheckbox.checked) {
        settings.paused = true
    } else {
        settings.paused = false
    }
})
selectedField.addEventListener('change', () => {
    settings.visField = selectedField.value as VisField
    showOrHideParticleInput()
})
particleLinesCheckbox.addEventListener('change', () => {
    if (particleLinesCheckbox.checked) {
        settings.showParticleTrails = true
    } else {
        settings.showParticleTrails = false
    }
    showOrHideTrailsInput()
})

imageUpload.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) {
        return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
        const image = new Image()
        image.src = e.target?.result as string
        image.onload = () => {
            settings.image = image
        }
    }
    reader.readAsDataURL(file)
})

let mouseDown = false
let lastMousePos = [0, 0]
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault()
})
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        settings.addDye = true
    }
    const x = e.clientX / canvas.width
    const y = 1 - e.clientY / canvas.height
    mouseDown = true
    lastMousePos = [x, y]
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
    }
})
canvas.addEventListener('mouseup', () => {
    if (settings.addDye) {
        settings.addDye = false
    }
    mouseDown = false
    settings.impulseMagnitude = 0
    settings.impulseRadius = 0
    settings.impulseDirection = [0, 0]
})

/**
 * Get the current settings.
 */
export const getSettings = () => settings

/**
 * Set the settings.
 */
export const setSettings = (newSettings: Partial<SimulationSettings>) => {
    Object.assign(settings, newSettings)
}
