import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  const config = {
    base: '/webgl-fluid',
    server: {
      host: '0.0.0.0',
      port: 3001,
    }
  }

  if (mode === 'local-dev') {
    // Use the local version of the package instead of the published version
    config.resolve = {
      alias: {
        '@red_j/webgl-fluid-sim': '/src/webgl-fluid-sim/src'
      }
    }
  }

  return config
})