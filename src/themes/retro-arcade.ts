import type { Theme } from './types'

export const retroArcade: Theme = {
  id: 'retro-arcade',
  label: 'Retro Arcade',
  presentation: 'scene',
  palette: {
    background: '#05010f',
    surface: '#140a2e',
    text: '#f5f5ff',
    textMuted: '#c4b5fd',
    accent: '#00f0ff',
    accentText: '#05010f',
    danger: '#ff5c8a',
  },
  fonts: {
    body: '"Press Start 2P", ui-monospace, "Courier New", monospace',
    heading: '"Press Start 2P", ui-monospace, "Courier New", monospace',
    stylesheet: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  },
  background: { kind: 'gradient', stops: ['#05010f', '#1a0638'], angle: 180 },
  fog: { color: '#05010f', near: 6, far: 26 },
  lights: {
    ambient: { color: '#7c3aed', intensity: 0.9 },
    key: { color: '#ff2bd6', intensity: 1.4, position: [-4, 5, 8] },
  },
  cardStyle: {
    cornerRadius: 0.02,
    borderWidth: 3,
    borderColor: '#ff2bd6',
    material: 'basic',
    emissive: 0.6,
  },
  layout: { strategy: 'ring', radius: 8, bandHeight: 2.5 },
  motion: { idleSpeed: 0.12, hoverStyle: 'glow', transitionEasing: 'linear', cameraShake: 0 },
  // Static scanlines only: no time-varying uniform, so nothing flickers.
  postFx: {
    bloom: { strength: 0.8, radius: 0.4, threshold: 0.6 },
    scanlines: { intensity: 0.18, count: 360 },
    vignette: { darkness: 0.6 },
  },
  ambientFx: {},
  copy: {
    heading: 'HUB ARCADE',
    subheading: 'Pick a game, any game',
    launchLabel: 'INSERT COIN TO LAUNCH',
    repoLabel: 'SOURCE',
    closeLabel: 'EXIT',
    searchPlaceholder: 'SEARCH GAMES',
    tooltip: 'PRESS START',
    emptyState: 'NO CARTRIDGES FOUND.',
    notFound: 'GAME OVER: NOT FOUND.',
  },
}
