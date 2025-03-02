/** 
 * This file handles the dom elements for controlling the simulation.
 * It creates a SimulationSettings object and updates it based on user input.
 */

import { ColorMode, ImpulseType, SimulationSettings, VisField, clamp } from "@red_j/webgl-fluid-sim"
import "./style.css"

const canvas = document.getElementById('waves') as HTMLCanvasElement

const selectedField = document.getElementById('field') as HTMLSelectElement
const bilerpCheckbox = document.getElementById('bilerp') as HTMLInputElement
const particleLinesCheckbox = document.getElementById('particleLines') as HTMLInputElement
const particleDensityInput = document.getElementById('particleDensity') as HTMLInputElement
const particleTrailSizeInput = document.getElementById('particleTrailSize') as HTMLInputElement
const regenerateParticlesCheckbox = document.getElementById('regenerateParticles') as HTMLInputElement
const pointSizeInput = document.getElementById('pointSize') as HTMLInputElement
const colorModeInput = document.getElementById('colorMode') as HTMLInputElement
const imageUpload = document.getElementById('imageUpload') as HTMLInputElement
const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement
const showParticlesForImageCheckbox = document.getElementById('imageParticlesCheckbox') as HTMLInputElement

const resetButton = document.getElementById('reset') as HTMLButtonElement
const pauseButton = document.getElementById('pause') as HTMLButtonElement
const haltButton = document.getElementById('halt') as HTMLButtonElement

/**
 * The simulation settings.
 */
const settings: SimulationSettings = {
    visField: selectedField.value as VisField,
    jacobiIterations: 25,
    gridScale: 0.5,
    manualBilerp: bilerpCheckbox?.checked ?? true,

    applyDiffusion: false,
    diffusionCoefficient: 1,

    advectionDissipation: 0.001,
    
    particleDensity: parseFloat(particleDensityInput.value) / 100.0,
    showParticleTrails: particleLinesCheckbox.checked,
    advectBackward: false,
    particleTrailSize: parseFloat(particleTrailSizeInput.value) / 100.0,
    particleSize: clamp(parseFloat(pointSizeInput.value), 1, 5),
    regenerateParticles: regenerateParticlesCheckbox.checked,

    externalForces: [
        {
            impulseDirection: [0, 0],
            impulsePosition: [0, 0],
            impulseRadius: 0,
            impulseMagnitude: 0,
            impulseType: ImpulseType.GaussianSplat,
        }
    ],

    addDye: false,
    image: null,
    drawImage: false,
    screenshot: false,

    colorMode: parseInt(colorModeInput.value, 10),
    paused: false,
    reset: false,
    halt: false,

    callbacks: {
        postForce: [],
        postAdvect: [],
        postJacobi: [],
        postColor: [],
    },
}

const getColorMode = () => parseInt(colorModeInput.value, 10)

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
    if (particleLinesCheckbox.checked && settings.visField === 'particles') {
        showOrHideElementsByClassname('trails', true)
    } else {
        showOrHideElementsByClassname('trails', false)
    }
}
showOrHideTrailsInput()

const showOrHideParticleInput = () => {
    if (settings.visField === 'particles') {
        showOrHideElementsByClassname('particles', true)
    } else {
        showOrHideElementsByClassname('particles', false)
    }
    showOrHideTrailsInput()
}
showOrHideParticleInput()

const showOrHideDyeText = () => {
    if (selectedField.value === 'dye') {
        showOrHideElementsByClassname('dye', true)
    } else {
        showOrHideElementsByClassname('dye', false)
    }
}
showOrHideDyeText()

const handleShowOrHideParticlesForImage = () => {
    if (selectedField.value === 'image') {
        if (showParticlesForImageCheckbox.checked) {
            settings.colorMode = ColorMode.Image
            settings.visField = 'particles'
        } else {
            settings.colorMode = getColorMode()
            settings.visField = 'image'
        }
        showOrHideParticleInput()
    } else {
        if (settings.colorMode === ColorMode.Image) {
            settings.colorMode = getColorMode()
        }
    }
}

const showOrHideImageInput = () => {
    if (selectedField.value === 'image') {
        showOrHideElementsByClassname('image', true)
        showOrHideElementsByClassname('colorMode', false)
        handleShowOrHideParticlesForImage()
    } else {
        showOrHideElementsByClassname('image', false)
        showOrHideElementsByClassname('colorMode', true)
        handleShowOrHideParticlesForImage()
    }
}
showOrHideImageInput()

resetButton.addEventListener('click', () => {
    settings.reset = true
    requestAnimationFrame(() => {
        settings.drawImage = true
    })
})
haltButton.addEventListener('click', () => {
    settings.halt = true
})
pauseButton.addEventListener('click', () => {
    settings.paused = !settings.paused
    if (settings.paused) {
        pauseButton.value = 'play'
        video?.pause()
    } else {
        pauseButton.value = 'pause'
        video?.play()
    }
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
    settings.colorMode = clamp(getColorMode(), 0, 3)
})
selectedField.addEventListener('change', () => {
    settings.visField = selectedField.value as VisField
    showOrHideParticleInput()
    showOrHideDyeText()
    showOrHideImageInput()
})
particleLinesCheckbox.addEventListener('change', () => {
    if (particleLinesCheckbox.checked) {
        settings.showParticleTrails = true
    } else {
        settings.showParticleTrails = false
    }
    showOrHideTrailsInput()
})
regenerateParticlesCheckbox.addEventListener('change', () => {
    settings.regenerateParticles = regenerateParticlesCheckbox.checked
})
showParticlesForImageCheckbox.addEventListener('change', () => {
    handleShowOrHideParticlesForImage()
})

uploadButton.addEventListener('click', () => {
    imageUpload.click();
});

let video: HTMLVideoElement | null = null;
async function processVideo(videoFile: File) {
    video = document.createElement('video');
    video.style.display = "none";
    video.src = URL.createObjectURL(videoFile);
  
    await video.play();
  
    const canvas = document.createElement('canvas');
    canvas.style.display = "none";
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error("Could not create 2D context");
  
    video.addEventListener('loadedmetadata', () => {
      canvas.width = video?.videoWidth ?? 0;
      canvas.height = video?.videoHeight ?? 0;
    });

    video.addEventListener('ended', () => video?.play())

    const drawFrame = () => {
      if (!video) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      canvas.toBlob((blob) => {
        if (blob) {
            const image = new Image()
            image.src = URL.createObjectURL(blob)
            image.onload = () => {
                settings.image = image
                settings.drawImage = true
            }
        }
      });
      requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
  }

imageUpload.addEventListener('change', (e) => {
    // reset video and clean up
    if (video) {
        video.pause()
        URL.revokeObjectURL(video.src)
    }
    video = null
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) {
        return
    }
    // check if file is an image or video
    const reader = new FileReader()
    const isImage = file.type.startsWith('image')
    const isVideo = file.type.startsWith('video')
    if (!isImage && !isVideo) {
        return
    }
    if (isImage) {
        reader.onload = (e) => {
            const image = new Image()
            image.src = e.target?.result as string
            image.onload = () => {
                settings.image = image
                settings.drawImage = true
                addImageDiv()
            }
        }
        reader.readAsDataURL(file)
        return
    }
    processVideo(file)
        .catch((err) => {
            console.error(err)
        })
        .finally(() => {
            addImageDiv()
        })
})

// add or update div with image name and 'reapply' button if the image has been uploaded
const addImageDiv = () => {
    const imageName = imageUpload.files?.[0]?.name ?? 'no image'
    const imageDiv = document.getElementById('imageDiv') as HTMLDivElement
    imageDiv.innerHTML = `image: ${imageName} <input type="button" value="reapply" id="reapplyButton">`

    const reapplyButton = document.getElementById('reapplyButton') as HTMLButtonElement
    reapplyButton.addEventListener('click', () => {
        settings.drawImage = true
    })
}

let lastMousePos = [0, 0]
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault()
})

let lastClickedTime = 0
let prevSpeed = 0
let lastMovedTime = 0
const onMouseDown = (e: PointerEvent) => {
    const doubleClick = performance.now() - lastClickedTime < 300
    if (
        (e instanceof MouseEvent && e.button === 2) ||
        doubleClick
    ) {
        settings.addDye = true
        if (doubleClick) {
            e.preventDefault()
        }
    }
    const x = (e as MouseEvent).offsetX / canvas.width
    const y = 1 - (e as MouseEvent).offsetY / canvas.height
    lastMousePos = [x, y]
    canvas.setPointerCapture((e as PointerEvent).pointerId)
    lastClickedTime = performance.now()
}
const onMouseMove = (e: PointerEvent) => {
    if (canvas.hasPointerCapture(e.pointerId)) {
        // F = ma
        // set m = 1, F = a
        const x = e.offsetX / canvas.width
        const y = 1 - e.offsetY / canvas.height
        const diff = [x - lastMousePos[0], y - lastMousePos[1]]
        // force direction is the direction of the mouse movement
        // normalize diff for direction
        const len = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1])
        const normalizedDiff: [number, number] = (len === 0 || len < 0.002) ? [0, 0] : [diff[0] / len, diff[1] / len]

        const [lastX, lastY] = lastMousePos
        const currSpeed = Math.sqrt((x - lastX)**2 + (y - lastY)**2)
        const now = performance.now()
        const acceleration = Math.max(currSpeed - prevSpeed, 0) / (now - Math.max(lastClickedTime, lastMovedTime))

        lastMousePos =  [x, y]
        lastMovedTime = now
        settings.externalForces = [
                {
                    impulseDirection: normalizedDiff,
                    impulsePosition: [x, y],
                    impulseRadius: 0.0001,
                    impulseMagnitude: acceleration * 300,
                    impulseType: ImpulseType.GaussianSplat,
                },
            ]
    }
}
const onMouseUp = (e: PointerEvent) => {
    if (settings.addDye) {
        settings.addDye = false
    }
    settings.externalForces = [
        {
            impulseDirection: [0, 0],
            impulsePosition: [0, 0],
            impulseRadius: 0,
            impulseMagnitude: 0,
            impulseType: ImpulseType.GaussianSplat,
        }
    ]
    canvas.releasePointerCapture(e.pointerId)
}

canvas.addEventListener('pointerdown', onMouseDown)
canvas.addEventListener('pointermove', onMouseMove)
canvas.addEventListener('pointerup', onMouseUp)
canvas.addEventListener('pointerleave', onMouseUp)

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



const collapseButton = document.getElementById('collapseButton') as HTMLButtonElement
const controls = document.getElementById('controls') as HTMLDivElement


const onCollapseOrExpand = () => {
    if (controls.classList.contains('collapsed')) {
        controls.classList.remove('collapsed')
        collapseButton.classList.add('expanded')
        controls.style.transform = 'translateY(0)'
    } else {
        controls.classList.add('collapsed')
        collapseButton.classList.remove('expanded')
        controls.style.transform = 'translateY(-100%)'
    }
}
collapseButton.addEventListener('click', onCollapseOrExpand)
collapseButton.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        onCollapseOrExpand()
    }
})

let screenShotKeyDown = false
document.addEventListener('keydown', (e) => {
    if (e.key === 's' && !screenShotKeyDown) {
        console.log('screenshot')
        settings.screenshot = true
        screenShotKeyDown = true
    }
})
document.addEventListener('keyup', () => {
    if (screenShotKeyDown) {
        settings.screenshot = false
        screenShotKeyDown = false
    }
})