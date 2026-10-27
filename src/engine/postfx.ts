import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { needsFinishPass, type PostFxConfig } from './postfx-config'

/** Scanlines are static (no temporal flicker); grain is frozen under reduced motion. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    scanIntensity: { value: 0 },
    scanCount: { value: 0 },
    vignette: { value: 0 },
    grain: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float scanIntensity;
    uniform float scanCount;
    uniform float vignette;
    uniform float grain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float line = 0.5 + 0.5 * sin(vUv.y * scanCount * 3.14159265 * 2.0);
      color.rgb *= 1.0 - scanIntensity * line;
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
      color.rgb += (hash(vUv * 512.0 + time) - 0.5) * grain;
      gl_FragColor = color;
    }
  `,
}

export class PostFx {
  private readonly composer: EffectComposer
  private readonly finish: ShaderPass | undefined
  private time = 0

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    config: PostFxConfig,
    private readonly reducedMotion: boolean,
  ) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))
    if (config.bloom) {
      const size = renderer.getSize(new Vector2())
      this.composer.addPass(
        new UnrealBloomPass(
          size,
          config.bloom.strength,
          config.bloom.radius,
          config.bloom.threshold,
        ),
      )
    }
    if (needsFinishPass(config)) {
      this.finish = new ShaderPass(FinishShader)
      const u = this.finish.uniforms
      u['scanIntensity']!.value = config.scanlines?.intensity ?? 0
      u['scanCount']!.value = config.scanlines?.count ?? 0
      u['vignette']!.value = config.vignette?.darkness ?? 0
      u['grain']!.value = config.grain?.amount ?? 0
      this.composer.addPass(this.finish)
    }
    this.composer.addPass(new OutputPass())
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio)
    this.composer.setSize(width, height)
  }

  render(deltaSeconds: number): void {
    if (this.finish && !this.reducedMotion) {
      this.time = (this.time + deltaSeconds) % 100
      this.finish.uniforms['time']!.value = this.time
    }
    this.composer.render(deltaSeconds)
  }

  dispose(): void {
    this.composer.passes.forEach((pass) => pass.dispose())
    this.composer.dispose()
  }
}
