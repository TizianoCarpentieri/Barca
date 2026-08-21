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
  const tubular = Math.max(24, Math.ceil(len * 6))
  const geo = new THREE.TubeGeometry(curve, tubular, radius, 10, false)
  const mesh = new THREE.Mesh(geo, material)
  return { mesh, geo, curve, len, indexCount: geo.index ? geo.index.count : geo.attributes.position.count }
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
      disposers.push(t.geo)
    }
  }
  return disposers
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function makeLabel(text, fill) {
  const c = document.createElement("canvas")
  c.width = 384
  c.height = 96
  const ctx = c.getContext("2d")
  ctx.font = "700 52px Barlow Condensed, Barlow, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.lineWidth = 10
  ctx.strokeStyle = "#0b0908"
  ctx.strokeText(text, 192, 50)
  ctx.fillStyle = fill
  ctx.fillText(text, 192, 50)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true }),
  )
  spr.scale.set(4.4, 1.1, 1)
  spr.center.set(0.5, -0.15)
  return { spr, tex, mat: spr.material }
}

export function createKnotView({ container, knot, reduced = false, onHit, onOrbit, onError, onTap }) {
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
  const buoyMat = mat(BUOY, { roughness: 0.5, metalness: 0.12, emissive: BUOY, emissiveIntensity: 0.18 })
  const ghostMat = new THREE.MeshBasicMaterial({
    color: BUOY,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
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
    const ghosts = []
    for (const path of stepPaths(step)) {
      const material = path.kind === "standing" ? foamMat : buoyMat
      const t = tubeMesh(path.pts, RADIUS, material)
      if (!t) continue
      t.kind = path.kind
      t.geo.setDrawRange(0, t.indexCount)
      group.add(t.mesh)
      tubes.push(t)
      if (path.kind === "working") {
        const g = tubeMesh(path.pts, RADIUS * 0.55, ghostMat)
        if (g) {
          g.mesh.visible = false
          scene.add(g.mesh)
          ghosts.push(g)
        }
      }
    }
    scene.add(group)
    const hit = stepHit3(step)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), waitMat)
    ball.position.set(hit[0], hit[1], hit[2])
    ball.visible = false
    ball.userData.stepIndex = knot.steps.indexOf(step)
    scene.add(ball)
    return { group, tubes, ghosts, ball, step }
  })

  const tip = new THREE.Group()
  const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), buoyMat)
  const tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.35, 12), buoyMat)
  tipCone.rotation.x = Math.PI / 2
  tipCone.position.z = -1.15
  tip.add(tipBall)
  tip.add(tipCone)
  const capo = makeLabel("CAPO", "#ff3b0a")
  capo.spr.position.set(0, 1.35, 0)
  tip.add(capo.spr)
  tip.visible = false
  scene.add(tip)
  const _look = new THREE.Object3D()
  scene.add(_look)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = !reduced
  controls.dampingFactor = 0.08
  controls.minDistance = dist * 0.45
  controls.maxDistance = dist * 1.85
  controls.minPolarAngle = 0.35
  controls.maxPolarAngle = Math.PI - 0.4
  controls.target.copy(center)
  controls.autoRotate = false
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
  let userSteering = false
  let speed = 1
  let gateRing = null
  let crossSpr = null

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

  function hideGhosts() {
    stepGroups.forEach((g) => g.ghosts.forEach((gh) => (gh.mesh.visible = false)))
  }

  function ensureGateRing() {
    if (gateRing) return gateRing
    const geo = new THREE.TorusGeometry(1, 0.085, 10, 48)
    const m = new THREE.MeshBasicMaterial({ color: BUOY, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false })
    const mesh = new THREE.Mesh(geo, m)
    mesh.visible = false
    mesh.renderOrder = 3
    scene.add(mesh)
    gateRing = { mesh, geo, mat: m, r: 1 }
    return gateRing
  }

  function showGate(gate) {
    if (!gate || tryMode || reduced) return
    const g = ensureGateRing()
    g.r = gate.r
    g.mesh.position.set(gate.pos[0], gate.pos[1], gate.pos[2])
    g.mesh.scale.setScalar(gate.r)
    g.mesh.visible = true
  }

  function hideGate() {
    if (gateRing) gateRing.mesh.visible = false
  }

  function showCrossLabel(cross, ms = 0) {
    if (!cross) return
    if (!crossSpr || crossSpr.text !== cross.label) {
      if (crossSpr) {
        scene.remove(crossSpr.spr)
        crossSpr.tex.dispose()
        crossSpr.mat.dispose()
      }
      const made = makeLabel(cross.label, "#ffd23e")
      made.spr.position.set(cross.pos[0], cross.pos[1], cross.pos[2])
      made.spr.scale.set(6.2, 1.55, 1)
      made.mat.opacity = 0
      scene.add(made.spr)
      crossSpr = { spr: made.spr, tex: made.tex, mat: made.mat, text: cross.label, shown: true, until: ms > 0 ? performance.now() + ms : 0 }
    } else {
      crossSpr.spr.position.set(cross.pos[0], cross.pos[1], cross.pos[2])
      crossSpr.shown = true
      crossSpr.until = ms > 0 ? performance.now() + ms : 0
    }
  }

  function hideCrossLabel() {
    if (crossSpr) crossSpr.shown = false
  }

  function leadTube(g) {
    return g.tubes.find((t) => t.kind === "working") || g.tubes[0]
  }

  function placeTip(curve, t, kind) {
    const u = Math.min(1, Math.max(0, t))
    const p = curve.getPointAt(u)
    const tan = curve.getTangentAt(u).normalize()
    tip.visible = true
    tip.position.copy(p)
    _look.position.copy(p)
    const up = Math.abs(tan.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    _look.up.copy(up)
    _look.lookAt(p.clone().add(tan))
    tip.quaternion.copy(_look.quaternion)
    const working = kind !== "standing"
    tipBall.material = working ? buoyMat : foamMat
    tipCone.material = working ? buoyMat : foamMat
    tipCone.visible = working
    capo.spr.visible = working
  }

  function restTip() {
    for (let i = revealed - 1; i >= 0; i -= 1) {
      const lead = leadTube(stepGroups[i])
      if (!lead) continue
      placeTip(lead.curve, 1, lead.kind)
      return
    }
    tip.visible = false
  }

  function camOffsetFor(curve) {
    const a = curve.getPointAt(0.15)
    const b = curve.getPointAt(0.55)
    const tan = b.clone().sub(a).normalize()
    const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0))
    if (side.lengthSq() < 0.04) side.set(1, 0, 0)
    side.normalize()
    return side.multiplyScalar(Math.max(11, span * 0.7)).add(new THREE.Vector3(0, Math.max(4, span * 0.28), 0))
  }

  function crossSpeedAt(p, cross) {
    if (!cross) return 1
    return Math.abs(p - cross.at) < 0.12 ? 0.35 : 1
  }

  function startAnim(g) {
    const lead = leadTube(g)
    if (!lead) return
    const baseDur = reduced ? 1 : Math.max(1600, Math.min(2800, lead.len * 95))
    g.ghosts.forEach((gh) => {
      gh.mesh.visible = !tryMode
    })
    g.tubes.forEach((t) => setDraw(t, 0))
    const offset = userSteering ? camera.position.clone().sub(controls.target) : camOffsetFor(lead.curve)
    const follow = !userSteering && !reduced
    const gate = !tryMode && !reduced ? g.step.gate || null : null
    const cross = !tryMode ? g.step.cross || null : null
    anim = {
      g,
      lead,
      start: performance.now(),
      last: 0,
      dur: baseDur / speed,
      offset,
      follow,
      preDelay: reduced || tryMode ? 0 : 700,
      progress: 0,
      gate,
      cross,
      camFrom: null,
      camTo: null,
    }
    if (!tryMode) hideCrossLabel()
    if (gate) {
      showGate(gate)
      if (!userSteering) {
        const tgt = new THREE.Vector3(gate.pos[0], gate.pos[1], gate.pos[2])
        const dir = camera.position.clone().sub(controls.target)
        if (dir.lengthSq() < 0.01) dir.set(0.3, 0.2, 1)
        dir.normalize().multiplyScalar(Math.max(9, span * 0.5))
        anim.camFrom = { pos: camera.position.clone(), tgt: controls.target.clone() }
        anim.camTo = { pos: tgt.clone().add(dir), tgt: tgt.clone() }
        anim.offset = anim.camTo.pos.clone().sub(anim.camTo.tgt)
      }
    } else {
      hideGate()
    }
    if (follow) controls.enabled = false
    placeTip(lead.curve, 0, lead.kind)
  }

  function applyReveal(count, fresh, animate) {
    revealed = count
    hideGhosts()
    stepGroups.forEach((g, i) => {
      const on = i < count
      g.group.visible = on
      g.tubes.forEach((t) => setDraw(t, on ? 1 : 0))
    })
    if (animate && fresh >= 0 && fresh < count) {
      const g = stepGroups[fresh]
      g.group.visible = true
      startAnim(g)
    } else {
      anim = null
      hideGate()
      hideCrossLabel()
      controls.enabled = true
      restTip()
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
    pulse += 0.045
    if (anim) {
      const dt = Math.min(64, now - (anim.last || anim.start))
      anim.last = now
      if (anim.preDelay > 0) {
        anim.preDelay = Math.max(0, anim.preDelay - dt)
        if (anim.camTo) {
          const k = easeInOut(Math.min(1, 1 - anim.preDelay / 700))
          camera.position.lerpVectors(anim.camFrom.pos, anim.camTo.pos, k)
          controls.target.lerpVectors(anim.camFrom.tgt, anim.camTo.tgt, k)
          camera.lookAt(controls.target)
        }
      } else {
        anim.progress = Math.min(1, anim.progress + (dt / anim.dur) * crossSpeedAt(anim.progress, anim.cross))
        if (anim.gate && anim.progress > 0.3) hideGate()
      }
      const t = anim.preDelay > 0 ? 0 : easeInOut(anim.progress)
      anim.g.tubes.forEach((tube) => setDraw(tube, t))
      placeTip(anim.lead.curve, t, anim.lead.kind)
      if (anim.cross && anim.preDelay <= 0 && Math.abs(anim.progress - anim.cross.at) < 0.2) {
        showCrossLabel(anim.cross)
      } else if (crossSpr && crossSpr.until === 0) {
        hideCrossLabel()
      }
      if (anim.follow && !userSteering && anim.preDelay <= 0) {
        const p = anim.lead.curve.getPointAt(t)
        controls.target.copy(p)
        camera.position.copy(p).add(anim.offset)
        camera.lookAt(p)
      }
      if (t >= 1) {
        anim.g.ghosts.forEach((gh) => (gh.mesh.visible = false))
        anim = null
        hideGate()
        if (crossSpr && crossSpr.until === 0) hideCrossLabel()
        controls.enabled = true
        restTip()
      }
      needs = true
    }
    if (gateRing && gateRing.mesh.visible) {
      gateRing.mesh.quaternion.copy(camera.quaternion)
      gateRing.mesh.scale.setScalar(gateRing.r * (1 + Math.sin(pulse) * 0.07))
      gateRing.mat.opacity = 0.42 + Math.sin(pulse) * 0.22
      needs = true
    }
    if (crossSpr) {
      if (crossSpr.until > 0 && now > crossSpr.until) crossSpr.shown = false
      const target = crossSpr.shown ? 1 : 0
      if (Math.abs(target - crossSpr.mat.opacity) > 0.01) {
        crossSpr.mat.opacity += (target - crossSpr.mat.opacity) * 0.14
        needs = true
      }
      crossSpr.spr.visible = crossSpr.shown || crossSpr.mat.opacity > 0.03
    }
    if (tryMode) {
      const g = stepGroups[current]
      if (g?.ball.visible && g.ball.material === nowMat) {
        const s = 1 + Math.sin(pulse) * 0.14
        g.ball.scale.setScalar(s)
        needs = true
      }
    }
    if (controls.enableDamping) needs = true
    if (!needs && !document.hidden) return
    if (document.hidden) return
    if (!(anim && anim.follow && !userSteering)) controls.update()
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
    userSteering = true
    if (anim) anim.follow = false
    controls.enabled = true
    onOrbit?.()
  })
  canvas.addEventListener("pointerup", (e) => {
    if (!ptr) return
    const dx = e.clientX - ptr.x
    const dy = e.clientY - ptr.y
    ptr = null
    if (dx * dx + dy * dy > 81) return
    if (tryMode) {
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
      return
    }
    if (anim) {
      anim.preDelay = 0
      if (anim.progress < 1) anim.progress = 0.999
      return
    }
    onTap?.()
  })
  controls.addEventListener("start", () => {
    userSteering = true
    if (anim) anim.follow = false
    controls.enabled = true
    onOrbit?.()
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
    setSpeed(s) {
      speed = s
    },
    flashCross(i) {
      const st = knot.steps[i]
      if (!st?.cross) return
      showCrossLabel(st.cross, 1500)
      needs = true
    },
    replay() {
      if (revealed < 1) return
      userSteering = false
      applyReveal(revealed, revealed - 1, true)
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
      ghostMat.dispose()
      waitMat.dispose()
      nowMat.dispose()
      doneMat.dispose()
      capo.tex.dispose()
      capo.mat.dispose()
      tipBall.geometry.dispose()
      tipCone.geometry.dispose()
      extras.forEach((x) => x.dispose?.())
      if (gateRing) {
        gateRing.geo.dispose()
        gateRing.mat.dispose()
      }
      if (crossSpr) {
        crossSpr.tex.dispose()
        crossSpr.mat.dispose()
      }
      stepGroups.forEach((g) => {
        g.tubes.forEach((t) => t.geo.dispose())
        g.ghosts.forEach((gh) => gh.geo.dispose())
        g.ball.geometry.dispose()
      })
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    },
  }
}
