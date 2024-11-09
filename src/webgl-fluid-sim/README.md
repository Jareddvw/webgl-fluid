# WebGL Fluid Simulation

This is a package for a simple 2D fluid simulation written in TypeScript using WebGL2.

Try the demo [here](https://jareddvw.github.io/webgl-fluid/).

## Installation

You can install this package using npm or pnpm:

```bash
npm install @red_j/webgl-fluid-sim
# or
pnpm install @red_j/webgl-fluid-sim
```

## Usage

Basic example of how to use this library:

```ts
import { Simulation, SimulationSettings, VisField } from "@red_j/webgl-fluid-sim";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const simulation = new Simulation(canvas);
const settings: Partial<SimulationSettings> = {};

// Update the settings using user inputs here, e.g.
selectedField.addEventListener('change', () => {
    settings.visField = selectedField.value as VisField
})


// Run the simulation
const update = () => {
    // grab the settings at the start of the frame and update the 
    // simulation with them
    simulation.updateSettings(settings);
    // run the simulation
    simulation.step(0.016);
    requestAnimationFrame(update);
};
update();
```

Example with React:

```tsx
import { Simulation, SimulationSettings } from "@red_j/webgl-fluid-sim";
import { useEffect, useRef } from "react";

const Canvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // settings ref to update from any user inputs
    const settingsRef = useRef<Partial<SimulationSettings>>({});

    const handleMouseEvents = (e: MouseEvent) => {
        // update settingsRef here
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const simulation = new Simulation(canvas);
        const update = () => {
            simulation.updateSettings(settingsRef.current);
            simulation.step(0.016);
            requestAnimationFrame(update);
        };
        update();
    }, []);

    return (
        <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseEvents}
            onMouseMove={handleMouseEvents}
            onMouseUp={handleMouseEvents}
            onMouseLeave={handleMouseEvents}
        />
    );
};
```

## API Reference 

### Simulation
The main class for creating and managing a fluid simulation.

#### Constructor
```ts
new Simulation(canvas: HTMLCanvasElement, settings: Partial<SimulationSettings> = {})
```

#### Methods
```ts
// Run a single step of the simulation.
step(deltaT: number = this.deltaT): void;

// Update the settings to use the next time step() is called.
updateSettings(newSettings: Partial<SimulationSettings>): void;

// Get the FBOs.
getFBOs(): FBORecord;

// Get the programs.
getPrograms(): ProgramRecord;

// Get the settings.
getSettings(): SimulationSettings;
```

### SimulationSettings
The settings for the simulation each frame.

```ts
type SimulationSettings = {
    // fluid settings
    visField: VisField,
    jacobiIterations: number,
    gridScale: number,
    manualBilerp: boolean,

    // diffusion settings (currently ignored)
    applyDiffusion: boolean,
    diffusionCoefficient: number,

    // advect settings
    advectionDissipation: number,

    // force settings
    externalForces: ExternalForce[],

    // particle settings
    particleDensity: number,
    showParticleTrails: boolean,
    particleTrailSize: number,
    particleSize: number,
    advectBackward: boolean,
    regenerateParticles: boolean, // whether to randomly reset particles to their original position

    // dye settings
    addDye: boolean,

    // the image to draw
    image: HTMLImageElement | null,
    // whether to draw the image to the image FBO in the next frame. Needs to be manually set to false afterwards
    drawImage: boolean,
    // whether to screenshot the next frame
    screenshot: boolean,

    // global settings
    colorMode: ColorMode, // ColorMode.Image is only used for particles where image is non-null.
    paused: boolean,
    // reset the entire simulation in the next frame
    reset: boolean,
    // reset the velocity/pressure fields in the next frame
    halt: boolean,

    // Callbacks -- advanced settings to let the user call functions at different stages in the simulation
    callbacks: SimulationCallbackMap,
}
```

## Contributing
Contributions are welcome! Please feel free to open an issue or submit a PR.

## License
[ISC](https://choosealicense.com/licenses/isc/)


