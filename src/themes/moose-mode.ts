import type { Theme } from './types'

// Personality note: the `moose` repo is a deadpan, captioned forest toy ("answering nature",
// "browsing leaves"). Moose Mode keeps that straight-faced caption voice and turns the volume up.
export const mooseMode: Theme = {
  id: 'moose-mode',
  label: 'Moose Mode',
  presentation: 'scene',
  palette: {
    background: '#ffe14d',
    surface: '#ffffff',
    text: '#1d1233',
    textMuted: '#4a2a6b',
    accent: '#d6006f',
    accentText: '#ffffff',
    danger: '#b00020',
  },
  fonts: {
    body: '"Comic Neue", "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif',
    heading: 'Bangers, "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif',
    stylesheet:
      'https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap',
  },
  background: { kind: 'gradient', stops: ['#ffe14d', '#ff7ad9', '#3ee0c5'], angle: 135 },
  fog: { color: '#ffb3ec', near: 10, far: 36 },
  lights: {
    ambient: { color: '#fff4d6', intensity: 1.2 },
    key: { color: '#ffffff', intensity: 1, position: [-4, 7, 6] },
  },
  cardStyle: {
    cornerRadius: 0.5,
    borderWidth: 3,
    borderColor: '#1d1233',
    material: 'standard',
    emissive: 0.15,
  },
  layout: { strategy: 'ring', radius: 8, bandHeight: 2.6 },
  // Bobbing, wobbling and bouncy, but no camera shake (motion-sickness safe).
  motion: { idleSpeed: 0.18, hoverStyle: 'wobble', transitionEasing: 'bounce', cameraShake: 0 },
  // No flashing effects: confetti-like particles only.
  postFx: { vignette: { darkness: 0.1 } },
  ambientFx: { particles: { count: 90, size: 0.14, color: '#ffffff', speed: 0.5 } },
  copy: {
    heading: 'MOOSE MODE',
    subheading: 'Browsing leaves. Also websites.',
    launchLabel: 'ANTLERS FORWARD!',
    repoLabel: 'Sniff the source',
    closeLabel: 'Retreat to forest',
    searchPlaceholder: 'Search the woodland',
    tooltip: 'Moose is considering this one',
    emptyState: 'No sites here. Moose is answering nature.',
    notFound: 'That site wandered off. Moose is also lost.',
  },
}
