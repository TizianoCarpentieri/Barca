import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { stepHit3, stepPaths } from "./nodi-data.js"

const FOAM = 0xf3ebe0
const BUOY = 0xff3b0a
const BRASS = 0xe0b04a
const WOOD = 0x3a2e24
const RADIUS = 0.42

export function supportsKnot3D() {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.08,
    ...extra,
  })
}

function tubeMesh(pts, radius, material) {
  if (!pts || pts.length < 2) return null
  const vecs = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
  if (vecs.length === 2) {
    vecs.splice(1, 0, vecs[0].clone().lerp(vecs[1], 0.5))
  }
  const curve = new THREE.CatmullRomCurve3(vecs, false, "catmullrom", 0.18)
  const len = Math.max(curve.getLength(), 0.4)
  const tubular = Math.max(18, Math.ceil(len * 5))
  const geo = new THREE.TubeGeometry(curve, tubular, radius, 10, false)
  const mesh = new THREE.Mesh(geo, material)
  return { mesh, geo, curve, indexCount: geo.index ? geo.index.count : geo.attributes.position.count }
}

function addCap(group, pt, radius, material) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), material)
  s.position.set(pt[0], pt[1], pt[2])
  group.add(s)
  return s
}

function knotBounds(knot) {
  let minX = 99
  let minY = 99
  let minZ = 99
  let maxX = -99
  let maxY = -99
  let maxZ = -99
  const eat = (p) => {
    minX = Math.min(minX, p[0])
    minY = Math.min(minY, p[1])
    minZ = Math.min(minZ, p[2])
    maxX = Math.max(maxX, p[0])
    maxY = Math.max(maxY, p[1])
    maxZ = Math.max(maxZ, p[2])
  }
  for (const step of knot.steps) {
    for (const path of stepPaths(step)) path.pts.forEach(eat)
  }
  if (knot.objectPts) knot.objectPts.forEach(eat)
  if (knot.object === "pole") {
    eat([-2, -11, -2])
    eat([2, 11, 2])
  }
  if (knot.object === "ring") {
    const pos = knot.objectPos || [0, 5.7, 0]
    const r = (knot.objectR || 2.85) + 0.6
    eat([pos[0] - r, pos[1] - r, pos[2] - r])
    eat([pos[0] + r, pos[1] + r, pos[2] + r])
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 10)
  return { center: new THREE.Vector3(cx, cy, cz), span }
}

function addObject(scene, knot, foamMat) {
  const disposers = []
  if (knot.object === "pole") {
    const geo = new THREE.CylinderGeometry(1.18, 1.18, 22, 28)
    const mesh = new THREE.Mesh(geo, mat(WOOD, { roughness: 0.86 }))
    scene.add(mesh)
    disposers.push(geo, mesh.material)
    ;[-8.6, 8.6].forEach((y) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.22, 0.08, 8, 20),
        mat(BRASS, { metalness: 0.7, roughness: 0.3 }),
      )
      ring.rotation.x = Math.PI / 2
      ring.position.y = y
      scene.add(ring)
      disposers.push(ring.geometry, ring.material)
    })
  }
  if (knot.object === "ring") {
    const geo = new THREE.TorusGeometry(knot.objectR || 2.85, 0.5, 18, 56)
    const mesh = new THREE.Mesh(geo, mat(BRASS, { metalness: 0.74, roughness: 0.3 }))
    const pos = knot.objectPos || [0, 5.7, 0]
    mesh.position.set(pos[0], pos[1], pos[2])
    scene.add(mesh)
    disposers.push(geo, mesh.material)
  }
  if (knot.object === "bight" && knot.objectPts) {
    const t = tubeMesh(knot.objectPts, 0.62, foamMat)
    if (t) {
      scene.add(t.mesh)
      addCap(scene, knot.objectPts[0], 0.62, foamMat)
      addCap(scene, knot.objectPts[knot.objectPts.length - 1], 0.62, foamMat)
      disposers.push(t.geo)
    }
  }
  return disposers
}

function easeOut(t) {
  return 1 - (1 - t) ** 3
}

export function createKnotView({ container, knot, reduced = false, onHit, onOrbit, onError }) {
  const scene = new THREE.Scene()
  const { center, span } = knotBounds(knot)
  const dist = Math.max(16, span * 1.55)

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120)
  camera.position.set(center.x + dist * 0.52, center.y + span * 0.22, center.z + dist * 0.86)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute("aria-hidden", "true")
  container.innerHTML = ""
  container.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0x7eb8c4, 0x1a120e, 0.72)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff1d6, 1.15)
  key.position.set(8, 14, 12)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x4d7c8c, 0.38)
  fill.position.set(-10, 4, -6)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xff6a3d, 0.18)
  rim.position.set(0, 6, -10)
  scene.add(rim)

  const foamMat = mat(FOAM, { roughness: 0.58 })
  const buoyMat = mat(BUOY, { roughness: 0.5, metalness: 0.12, emissive: BUOY, emissiveIntensity: 0.07 })
  const waitMat = new THREE.MeshBasicMaterial({
    color: 0xf3ebe0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  })
  const nowMat = new THREE.MeshBasicMaterial({
    color: BUOY,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
  const doneMat = new THREE.MeshBasicMaterial({
    color: 0x3dba7a,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })

  const extras = addObject(scene, knot, foamMat)
  const stepGroups = knot.steps.map((step) => {
    const group = new THREE.Group()
    group.visible = false
    const tubes = []
    for (const path of stepPaths(step)) {
      const material = path.kind === "standing" ? foamMat : buoyMat
      const t = tubeMesh(path.pts, RADIUS, material)
      if (!t) continue
      t.mesh.userData.indexCount = t.indexCount
      t.geo.setDrawRange(0, t.indexCount)
      group.add(t.mesh)
      addCap(group, path.pts[0], RADIUS, material)
      addCap(group, path.pts[path.pts.length - 1], RADIUS, material)
      tubes.push(t)
    }
    scene.add(group)
    const hit = stepHit3(step)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), waitMat)
    ball.position.set(hit[0], hit[1], hit[2])
    ball.visible = false
    ball.userData.stepIndex = knot.steps.indexOf(step)
    scene.add(ball)
    return { group, tubes, ball }
  })

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = !reduced
  controls.dampingFactor = 0.08
  controls.minDistance = dist * 0.55
  controls.maxDistance = dist * 1.85
  controls.minPolarAngle = 0.35
  controls.maxPolarAngle = Math.PI - 0.4
  controls.target.copy(center)
  controls.autoRotate = !reduced
  controls.autoRotateSpeed = 1.15
  controls.rotateSpeed = 0.72
  controls.touches.ONE = THREE.TOUCH.ROTATE
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN

  let running = true
  let raf = 0
  let needs = true
  let anim = null
  let tryMode = false
  let current = 0
  let revealed = 0
  let pulse = 0
  let hintGone = false

  function resize() {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    needs = true
  }

  function setDraw(tube, frac) {
    const n = tube.indexCount
    tube.geo.setDrawRange(0, Math.max(0, Math.floor(frac * n)))
  }

  function applyReveal(count, fresh, animate) {
    revealed = count
    stepGroups.forEach((g, i) => {
      const on = i < count
      g.group.visible = on
      g.tubes.forEach((t) => setDraw(t, on ? 1 : 0))
    })
    if (animate && !reduced && fresh >= 0 && fresh < count) {
      const g = stepGroups[fresh]
      g.tubes.forEach((t) => setDraw(t, 0))
      anim = { g, start: performance.now(), dur: 820 }
    }
    needs = true
  }

  function applyHits() {
    stepGroups.forEach((g, i) => {
      g.ball.visible = tryMode
      if (!tryMode) return
      if (i < revealed) g.ball.material = doneMat
      else if (i === current) g.ball.material = nowMat
      else g.ball.material = waitMat
    })
    needs = true
  }

  function tick() {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const now = performance.now()
    if (anim) {
      const t = easeOut(Math.min(1, (now - anim.start) / anim.dur))
      anim.g.tubes.forEach((tube) => setDraw(tube, t))
      if (t >= 1) anim = null
      needs = true
    }
    if (tryMode) {
      pulse += 0.045
      const g = stepGroups[current]
      if (g?.ball.visible && g.ball.material === nowMat) {
        const s = 1 + Math.sin(pulse) * 0.14
        g.ball.scale.setScalar(s)
        needs = true
      }
    }
    if (controls.autoRotate || controls.enableDamping) needs = true
    if (!needs && !document.hidden) {
      return
    }
    if (document.hidden) return
    controls.update()
    renderer.render(scene, camera)
    needs = false
  }

  function onLost(e) {
    e.preventDefault()
    onError?.()
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  let ptr = null
  const canvas = renderer.domElement
  canvas.style.touchAction = "none"
  canvas.addEventListener("webglcontextlost", onLost)
  canvas.addEventListener("pointerdown", (e) => {
    ptr = { x: e.clientX, y: e.clientY }
    if (!hintGone) {
      hintGone = true
      controls.autoRotate = false
      onOrbit?.()
    }
  })
  canvas.addEventListener("pointerup", (e) => {
    if (!ptr || !tryMode) {
      ptr = null
      return
    }
    const dx = e.clientX - ptr.x
    const dy = e.clientY - ptr.y
    ptr = null
    if (dx * dx + dy * dy > 81) return
    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(mouse, camera)
    const balls = stepGroups.map((g) => g.ball).filter((b) => b.visible)
    const hit = ray.intersectObjects(balls, false)[0]
    if (hit) onHit?.(hit.object.userData.stepIndex)
  })
  controls.addEventListener("start", () => {
    if (!hintGone) {
      hintGone = true
      controls.autoRotate = false
      onOrbit?.()
    }
  })
  controls.addEventListener("change", () => {
    needs = true
  })

  const vis = () => {
    needs = true
  }
  document.addEventListener("visibilitychange", vis)

  tick()

  return {
    setStage({ revealed: n, current: cur = 0, fresh = -1, hits = false, animate = true }) {
      tryMode = hits
      current = cur
      applyReveal(n, fresh, animate)
      applyHits()
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener("visibilitychange", vis)
      canvas.removeEventListener("webglcontextlost", onLost)
      controls.dispose()
      renderer.dispose()
      foamMat.dispose()
      buoyMat.dispose()
      waitMat.dispose()
      nowMat.dispose()
      doneMat.dispose()
      extras.forEach((x) => x.dispose?.())
      stepGroups.forEach((g) => {
        g.tubes.forEach((t) => t.geo.dispose())
        g.ball.geometry.dispose()
      })
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    },
  }
}
