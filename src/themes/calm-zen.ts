import type { Theme } from './types'

export const calmZen: Theme = {
  id: 'calm-zen',
  label: 'Calm / Zen',
  presentation: 'scene',
  palette: {
    background: '#efe9fb',
    surface: '#ffffff',
    text: '#2b2848',
    textMuted: '#524d7a',
    accent: '#5b4bb7',
    accentText: '#ffffff',
    danger: '#b3364f',
  },
  fonts: {
    body: 'Nunito, "Segoe UI", system-ui, sans-serif',
    heading: 'Nunito, "Segoe UI", system-ui, sans-serif',
    stylesheet: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap',
  },
  background: { kind: 'gradient', stops: ['#fbe8f1', '#e6e4fb', '#dcf0f5'], angle: 160 },
  fog: { color: '#e6e4fb', near: 9, far: 34 },
  lights: {
    ambient: { color: '#fff7fb', intensity: 1.1 },
    key: { color: '#ffffff', intensity: 0.8, position: [3, 6, 8] },
  },
  cardStyle: {
    cornerRadius: 0.3,
    borderWidth: 1,
    borderColor: '#cfc6f0',
    material: 'standard',
    emissive: 0.05,
  },
  layout: { strategy: 'ring', radius: 9, bandHeight: 2.8 },
  // Very slow drift; disabled entirely under reduced motion by the controls.
  motion: { idleSpeed: 0.025, hoverStyle: 'bob', transitionEasing: 'easeInOut', cameraShake: 0 },
  // No bloom flash, no scanlines, no grain: nothing time-varying or flashing.
  postFx: { vignette: { darkness: 0.15 } },
  ambientFx: { particles: { count: 60, size: 0.08, color: '#ffffff', speed: 0.15 } },
  copy: {
    heading: 'Take your time',
    subheading: 'A quiet place to wander through my sites',
    launchLabel: 'Open gently',
    repoLabel: 'See the source',
    closeLabel: 'Close',
    searchPlaceholder: 'Look for something',
    tooltip: 'Rest here to see more',
    emptyState: 'Nothing here just now. Try a softer filter.',
    notFound: "We couldn't find that one. No rush.",
  },
}
