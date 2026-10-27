import type { Theme } from './types'

export const professional: Theme = {
  id: 'professional',
  label: 'Professional',
  presentation: 'scene',
  palette: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textMuted: '#cbd5e1',
    accent: '#2563eb',
    accentText: '#ffffff',
    danger: '#f87171',
  },
  fonts: {
    body: 'Inter, system-ui, sans-serif',
    heading: 'Inter, system-ui, sans-serif',
  },
  background: { kind: 'color', color: '#0f172a' },
  fog: { color: '#0f172a', near: 8, far: 30 },
  lights: {
    ambient: { color: '#94a3b8', intensity: 0.8 },
    key: { color: '#ffffff', intensity: 1.2, position: [4, 6, 8] },
  },
  cardStyle: {
    cornerRadius: 0.12,
    borderWidth: 1,
    borderColor: '#334155',
    material: 'glass',
    emissive: 0,
  },
  layout: { strategy: 'ring', radius: 8, bandHeight: 2.5 },
  motion: { idleSpeed: 0.05, hoverStyle: 'tilt', transitionEasing: 'easeInOut', cameraShake: 0 },
  postFx: { bloom: { strength: 0.25, radius: 0.5, threshold: 0.85 } },
  ambientFx: {},
  copy: {
    heading: 'Projects',
    subheading: 'A directory of deployed websites',
    launchLabel: 'Launch',
    repoLabel: 'Source',
    closeLabel: 'Close',
    searchPlaceholder: 'Search projects',
    tooltip: 'Select to view details',
    emptyState: 'No projects match your filters.',
    notFound: 'That project could not be found.',
  },
}
