import {
  Color,
  Material,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PMREMGenerator,
  Points,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
  type Object3D,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** The slice of WebGLRenderer the engine uses, so tests can supply a mock. */
export type EngineRenderer = Pick<
  WebGLRenderer,
  'domElement' | 'setSize' | 'setPixelRatio' | 'setAnimationLoop' | 'render' | 'dispose'
>

export interface SceneEngineOptions {
  container: HTMLElement
  /** Defaults to a real WebGLRenderer, created lazily so tests never need WebGL. */
  createRenderer?: () => EngineRenderer
  pixelRatio?: number
  background?: string
}

type FrameCallback = (deltaSeconds: number, elapsedSeconds: number) => void

const MAX_PIXEL_RATIO = 2

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose()
  }
  material.dispose()
}

/** Disposes geometries, materials and their textures for everything under `root`. */
export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Points)) return
    object.geometry.dispose()
    const materials: Material | Material[] = object.material
    if (Array.isArray(materials)) materials.forEach(disposeMaterial)
    else disposeMaterial(materials)
  })
}

function detectSoftwareRendering(renderer: EngineRenderer): boolean {
  if (!(renderer instanceof WebGLRenderer)) return false
  const gl = renderer.getContext()
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  return /swiftshader|llvmpipe|software/i.test(name)
}

export class SceneEngine {
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(50, 1, 0.1, 200)

  private readonly container: HTMLElement
  private readonly renderer: EngineRenderer
  private readonly frameCallbacks = new Set<FrameCallback>()
  private readonly resizeObserver: ResizeObserver | undefined
  private pixelRatio: number
  private lastTime: number | undefined
  private elapsed = 0
  private running = false
  private disposed = false
  private shadowsDirty = true
  private environment: Texture | undefined
  /** True when the GPU is really the CPU (SwiftShader, llvmpipe): skip the expensive effects. */
  readonly softwareRendering: boolean

  constructor(options: SceneEngineOptions) {
    this.container = options.container
    this.renderer = options.createRenderer?.() ?? this.createDefaultRenderer()
    this.softwareRendering = detectSoftwareRendering(this.renderer)
    if (this.softwareRendering && this.renderer instanceof WebGLRenderer) {
      this.renderer.shadowMap.enabled = false
    }
    this.pixelRatio = this.softwareRendering
      ? 1
      : Math.min(options.pixelRatio ?? globalThis.devicePixelRatio ?? 1, MAX_PIXEL_RATIO)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.camera.position.set(0, 0, 12)

    if (options.background) this.scene.background = new Color(options.background)

    this.container.appendChild(this.renderer.domElement)
    this.resize()

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.container)
    }
  }

  get domElement(): HTMLElement {
    return this.renderer.domElement
  }

  /** Registers a per-frame callback; returns an unsubscribe function. */
  onFrame(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback)
    return () => this.frameCallbacks.delete(callback)
  }

  setPixelRatio(ratio: number): void {
    this.pixelRatio = this.softwareRendering ? 1 : Math.min(ratio, MAX_PIXEL_RATIO)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.resize()
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.lastTime = undefined
    this.renderer.setAnimationLoop((time: number) => this.tick(time))
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    this.renderer.setAnimationLoop(null)
  }

  /** Advances one frame. `timeMs` is a DOMHighResTimeStamp, as given to animation loops. */
  tick(timeMs: number): void {
    const delta = this.lastTime === undefined ? 0 : Math.max(0, (timeMs - this.lastTime) / 1000)
    this.lastTime = timeMs
    this.elapsed += delta
    for (const callback of this.frameCallbacks) callback(delta, this.elapsed)
    if (this.shadowsDirty && this.renderer instanceof WebGLRenderer) {
      this.renderer.shadowMap.needsUpdate = true
    }
    this.shadowsDirty = false
    this.renderer.render(this.scene, this.camera)
  }

  /** Stops the loop and releases every GPU resource. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    this.resizeObserver?.disconnect()
    this.frameCallbacks.clear()
    disposeObject(this.scene)
    this.scene.clear()
    if (this.scene.background instanceof Texture) this.scene.background.dispose()
    this.environment?.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  /** Shadow maps are drawn only on request, since most frames nothing has moved. */
  requestShadowUpdate(): void {
    this.shadowsDirty = true
  }

  /**
   * A soft studio environment for glossy materials to reflect (assigned to them, not the whole
   * scene, which keeps the matte ones cheap). Undefined with a mock renderer.
   */
  studioEnvironment(): Texture | undefined {
    if (!(this.renderer instanceof WebGLRenderer) || this.softwareRendering) return undefined
    if (this.environment) return this.environment
    const generator = new PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.environment = generator.fromScene(room, 0.04).texture
    room.dispose()
    generator.dispose()
    return this.environment
  }

  private createDefaultRenderer(): EngineRenderer {
    const renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.type = PCFShadowMap
    renderer.toneMapping = NeutralToneMapping
    return renderer
  }
}
