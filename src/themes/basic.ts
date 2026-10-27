import type { Theme } from './types'

/**
 * Accessible list theme: no 3D, system fonts, black on white. Colours here are the
 * light, default scheme; `src/ui/basic.css` adapts them for `prefers-color-scheme: dark`
 * and `prefers-contrast: more`. The 3D fields are inert because `presentation: "list"`
 * never mounts the scene engine.
 */
export const basic: Theme = {
  id: 'basic',
  label: 'Basic',
  presentation: 'list',
  palette: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    textMuted: '#333333',
    accent: '#0000ee',
    accentText: '#ffffff',
    danger: '#b00000',
  },
  fonts: {
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    heading: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  },
  background: { kind: 'color', color: '#ffffff' },
  fog: { color: '#ffffff', near: 1, far: 2 },
  lights: {
    ambient: { color: '#ffffff', intensity: 1 },
    key: { color: '#ffffff', intensity: 0, position: [0, 0, 1] },
  },
  cardStyle: {
    cornerRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    material: 'basic',
    emissive: 0,
  },
  layout: { strategy: 'ring', radius: 1, bandHeight: 1 },
  motion: { idleSpeed: 0, hoverStyle: 'glow', transitionEasing: 'linear', cameraShake: 0 },
  postFx: {},
  ambientFx: {},
  copy: {
    heading: 'Sites',
    subheading: 'A list of deployed websites',
    launchLabel: 'Open site',
    repoLabel: 'Source code',
    closeLabel: 'Close',
    searchPlaceholder: 'Search sites',
    tooltip: 'Open this site',
    emptyState: 'No sites match your filters.',
    notFound: 'That site could not be found.',
  },
}
