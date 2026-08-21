/** Nodi da gommone: nome, uso, passi, SVG 2D e waypoints 3D. */

export const KNOT_TERMS = [
  { term: "Corrente", def: "Il capo che muovi tu, quello che lavora." },
  { term: "Dormiente", def: "La parte di cima che sta ferma, verso il carico o la bitta." },
  { term: "Asola / occhio", def: "Un anello di cima. La gassa è un occhio che non deve scorrere." },
  { term: "Volta", def: "Un giro della cima intorno a un oggetto o a se stessa." },
]

function V(sx, sy, z = 0) {
  return [(sx - 130) / 10, (160 - sy) / 10, z]
}

function bezier(p0, p1, p2, p3, n = 8) {
  const pts = []
  for (let i = 0; i <= n; i += 1) {
    const t = i / n
    const u = 1 - t
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      u * u * u * p0[2] + 3 * u * u * t * p1[2] + 3 * u * t * t * p2[2] + t * t * t * p3[2],
    ])
  }
  return pts
}

function join(parts) {
  const out = []
  for (const part of parts) {
    if (!part?.length) continue
    if (!out.length) {
      out.push(...part)
      continue
    }
    const a = out[out.length - 1]
    const b = part[0]
    const dup = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.04
    out.push(...(dup ? part.slice(1) : part))
  }
  return out
}

function arcY(radius, y, fromA, toA, n = 12, y1 = y) {
  const pts = []
  for (let i = 0; i <= n; i += 1) {
    const t = i / n
    const a = fromA + (toA - fromA) * t
    pts.push([Math.cos(a) * radius, y + (y1 - y) * t, Math.sin(a) * radius])
  }
  return pts
}

export function stepPaths(step) {
  if (step.paths3?.length) return step.paths3
  const out = []
  if (step.pts?.length) out.push({ kind: step.kind, pts: step.pts })
  if (step.pts2?.length) out.push({ kind: step.kind2 || "working", pts: step.pts2 })
  return out
}

export function stepHit3(step) {
  if (step.hit3) return step.hit3
  const paths = stepPaths(step)
  const pts = paths[0]?.pts
  if (!pts?.length) return [0, 0, 0]
  return pts[Math.floor(pts.length / 2)]
}

const otto1 = [V(130, 300, 0), V(130, 230, 0), V(130, 150, 0)]
const otto2 = bezier(V(130, 150, 0), V(186, 150, 0.75), V(204, 108, 0.95), V(168, 82, 0.45), 9)
const otto3 = join([
  bezier(V(168, 82, 0.45), V(128, 54, 0.1), V(74, 82, -0.85), V(82, 132, -1.05), 9),
  bezier(V(82, 132, -1.05), V(90, 176, -1.15), V(130, 158, -0.35), V(130, 150, 0.15), 8),
])
const otto4 = join([
  bezier(V(130, 150, 0.15), V(96, 146, 0.95), V(72, 102, 1.15), V(98, 68, 0.75), 8),
  [V(128, 44, 0.45)],
])

const gassa1 = [V(156, 300, 0), V(156, 230, 0), V(156, 132, 0)]
const gassa2 = join([
  bezier(V(156, 132, 0), V(156, 92, 0.7), V(108, 92, 0.95), V(108, 132, 0.35), 8),
  bezier(V(108, 132, 0.35), V(108, 164, -0.35), V(156, 164, -0.7), V(156, 132, 0.05), 8),
])
const gassa3 = join([
  [V(86, 268, 0.15), V(86, 210, 0.25), V(86, 156, 0.55)],
  bezier(V(86, 156, 0.55), V(98, 128, 0.85), V(128, 116, 1.05), V(156, 132, 0.9), 8),
])
const gassa4 = join([
  bezier(V(156, 132, 0.9), V(188, 122, 0.15), V(196, 88, -0.95), V(170, 70, -1.15), 8),
  bezier(V(170, 70, -1.15), V(154, 58, -0.85), V(150, 88, -0.25), V(156, 112, 0.2), 6),
])
const gassa5 = join([
  bezier(V(156, 112, 0.2), V(136, 128, 0.85), V(114, 146, 0.95), V(92, 168, 0.45), 8),
  [V(78, 214, 0.15)],
])

const parlatoR = 2.65
const parlato1 = [
  [-5.6, -12.2, 0],
  [-5.6, -7, 0],
  [-5.6, -2.4, 0],
  [-parlatoR, -2.3, 0],
]
const parlato2 = arcY(parlatoR, -2.3, Math.PI, Math.PI + Math.PI * 2, 20, -1.7)
const parlato3 = arcY(parlatoR, -1.7, Math.PI, Math.PI + Math.PI * 1.05, 16, 1.55)
const parlato4 = join([
  arcY(parlatoR, 1.55, Math.PI + Math.PI * 1.05, Math.PI + Math.PI * 1.55, 8, 2.1),
  [
    [-0.4, 1.35, -2.4],
    [1.2, 0.35, -1.1],
    [2.2, -0.4, 0.6],
    [1.6, -1.1, 1.7],
    [0.2, -1.55, 2.1],
  ],
])

const ringY = 5.7
const ringR = 2.85
const wrapR = 1.05
const tubeCy = ringY - ringR
function roundTurn(turns, n) {
  const pts = []
  for (let i = 0; i <= n; i += 1) {
    const t = i / n
    const v = t * turns * Math.PI * 2
    const u = -Math.PI / 2 + t * 0.95
    const rr = ringR + wrapR * Math.cos(v)
    pts.push([rr * Math.cos(u), ringY + rr * Math.sin(u), wrapR * Math.sin(v)])
  }
  return pts
}
const giro1 = [
  [0, -12.2, 0],
  [0, -6, 0],
  [0, 1.4, 0],
  [0, tubeCy - wrapR, 0],
]
const giro2 = roundTurn(1.5, 24)
const giro3 = join([
  [
    giro2[giro2.length - 1],
    [1.7, 1.6, 1.15],
    [2.05, -0.2, 0.7],
  ],
  arcY(1.85, -0.35, 0.15, Math.PI * 1.15, 12, -1.55),
])
const giro4 = join([
  [giro3[giro3.length - 1], [1.9, -1.7, 0.2], [2.05, -2.35, 0.85]],
  arcY(1.85, -2.45, 0.2, Math.PI * 1.2, 12, -3.55),
  [[1.6, -3.7, -0.2], [1.9, -4.2, 0.35]],
])

const bightPts = join([
  [V(48, 300, 0), V(48, 96, 0)],
  bezier(V(48, 96, 0), V(48, 44, 0.15), V(172, 44, 0.15), V(172, 96, 0), 10),
  bezier(V(172, 96, 0), V(172, 138, -0.2), V(84, 140, -0.2), V(84, 96, 0), 8),
])
const band1 = [V(48, 300, 0), V(48, 200, 0), V(48, 92, 0)]
const band2 = join([
  [V(210, 300, 0.1), V(210, 210, 0.15), V(210, 150, 0.25)],
  bezier(V(210, 150, 0.25), V(200, 118, 0.55), V(150, 108, 0.85), V(118, 118, 0.7), 8),
])
const band3 = bezier(V(118, 118, 0.7), V(78, 128, 0.15), V(58, 88, -0.95), V(92, 68, -1.15), 10)
const band4 = join([
  bezier(V(92, 68, -1.15), V(128, 46, -0.4), V(168, 68, 0.55), V(168, 108, 0.85), 8),
  bezier(V(168, 108, 0.85), V(168, 138, 0.95), V(138, 148, 0.55), V(118, 132, 0.15), 6),
  [V(118, 118, 0.05)],
])

const piano1a = [V(36, 168, 0), V(80, 168, 0), V(112, 168, 0)]
const piano1b = [V(224, 168, 0), V(180, 168, 0), V(148, 168, 0)]
const piano2 = join([
  bezier(V(112, 168, 0.05), V(124, 138, 1.05), V(148, 138, 1.05), V(160, 168, 0.1), 8),
  bezier(V(160, 168, 0.1), V(148, 198, -0.95), V(124, 198, -0.95), V(112, 168, 0.05), 8),
])
const piano3 = bezier(V(112, 168, 0.05), V(124, 198, 1.05), V(148, 198, 1.05), V(160, 168, 0.1), 8)
const piano4 = [
  { kind: "standing", pts: [V(112, 168, 0), V(78, 118, 0.15)] },
  { kind: "standing", pts: [V(112, 168, 0), V(78, 218, 0.15)] },
  { kind: "working", pts: [V(160, 168, 0), V(194, 118, 0.15)] },
  { kind: "working", pts: [V(160, 168, 0), V(194, 218, 0.15)] },
]

export const KNOTS = [
  {
    id: "nodo-otto",
    name: "Nodo a otto",
    english: "Figure-eight",
    level: 1,
    why: "Fermo di sicurezza: la scotta non scappa dal bozzello o dalla mano.",
    onBoat: "In fondo alle scotte, alle cime di ormeggio corte, ovunque non vuoi perdere il capo.",
    warn: "",
    quizUse: "Quale nodo usi come fermo, perché la cima non sfili?",
    object: "none",
    steps: [
      {
        title: "Dormiente dritta",
        text: "Tieni la dormiente verticale. Il corrente è il capo libero in basso, arancio.",
        kind: "standing",
        d: "M 130 300 L 130 150",
        hit: { x: 130, y: 230 },
        pts: otto1,
        hit3: V(130, 230, 0),
      },
      {
        title: "Prima volta",
        text: "Porta il corrente sopra la dormiente, verso destra, e inizia un giro largo.",
        kind: "working",
        d: "M 130 150 C 186 150 204 108 168 82",
        hit: { x: 186, y: 118 },
        pts: otto2,
        hit3: V(186, 118, 0.7),
        cross: { at: 0.12, label: "SOPRA LA DORMIENTE", pos: V(130, 150, 0) },
      },
      {
        title: "Incrocia dietro",
        text: "Il corrente passa dietro, incrocia, e forma il secondo occhio dell'otto.",
        kind: "working",
        d: "M 168 82 C 128 54 74 82 82 132 C 90 176 130 158 130 150",
        hit: { x: 86, y: 128 },
        pts: otto3,
        hit3: V(86, 128, -1.0),
        cross: { at: 0.45, label: "DIETRO LA PRIMA VOLTA", pos: V(84, 130, -0.8) },
      },
      {
        title: "Dentro e stringi",
        text: "Infila il corrente nel primo occhio e tira. L'otto non deve scorrere.",
        kind: "working",
        d: "M 130 150 C 96 146 72 102 98 68 L 128 44",
        hit: { x: 108, y: 72 },
        pts: otto4,
        hit3: V(98, 68, 0.8),
        gate: { pos: V(130, 112, 0.2), r: 2 },
        cross: { at: 0.35, label: "DENTRO L'OCCHIO", pos: V(112, 104, 0.5) },
      },
    ],
  },
  {
    id: "nodo-piano",
    name: "Nodo piano",
    english: "Reef / square knot",
    level: 1,
    why: "Unisce due capi uguali in modo piatto. Va bene per un fagotto, non per un ormeggio.",
    onBoat: "Chiudere un telo, una rete, un pacco. Non per unire due cime di lavoro in mare.",
    warn: "Se i diametri sono diversi o tira a scatti, si capovolge. Per unire due cime usa il nodo bandiera.",
    quizUse: "Quale nodo è piatto e va bene per un telo, ma NON per unire due cime in mare?",
    object: "none",
    steps: [
      {
        title: "Due capi",
        text: "Due cime dello stesso diametro, una di fronte all'altra.",
        kind: "standing",
        d: "M 36 168 L 112 168 M 224 168 L 148 168",
        hit: { x: 70, y: 168 },
        pts: piano1a,
        pts2: piano1b,
        kind2: "working",
        hit3: V(70, 168, 0),
      },
      {
        title: "Destra sopra",
        text: "Destro sopra il sinistro, poi sotto: primo mezzo nodo.",
        kind: "working",
        d: "M 112 168 C 124 138 148 138 160 168 C 148 198 124 198 112 168",
        hit: { x: 136, y: 140 },
        pts: piano2,
        hit3: V(136, 140, 1.0),
        cross: { at: 0.15, label: "DESTRO SOPRA IL SINISTRO", pos: V(112, 168, 0) },
      },
      {
        title: "Sinistra sopra",
        text: "Ora il contrario: sinistro sopra il destro, poi sotto. Devono essere specchiati.",
        kind: "working",
        d: "M 112 168 C 124 198 148 198 160 168",
        hit: { x: 136, y: 196 },
        pts: piano3,
        hit3: V(136, 196, 1.0),
        cross: { at: 0.15, label: "SINISTRO SOPRA IL DESTRO", pos: V(112, 168, 0) },
      },
      {
        title: "Tira i quattro capi",
        text: "Se è piano vedi due anelli simmetrici. Se è storto (nodo granseola) disfa e rifai.",
        kind: "working",
        d: "M 112 168 L 78 118 M 160 168 L 194 118 M 112 168 L 78 218 M 160 168 L 194 218",
        hit: { x: 190, y: 168 },
        paths3: piano4,
        hit3: V(190, 168, 0),
      },
    ],
  },
  {
    id: "gassa-amante",
    name: "Gassa d'amante",
    english: "Bowline",
    level: 2,
    why: "L'anello che non stringe e si disfa anche dopo il carico. Il nodo del marinaio.",
    onBoat: "Ormeggio a un anello, cima su un parafango, asola di sicurezza, recupero.",
    warn: "Se resta scarica a lungo può allentarsi. In sicurezza si aggiunge un fermo o si fa la gassa doppia.",
    quizUse: "Quale nodo fa un anello che non scorre e si scioglie anche bagnato?",
    object: "none",
    steps: [
      {
        title: "Dormiente",
        text: "La dormiente è l'albero. Resta dritta. Il corrente è il coniglio.",
        kind: "standing",
        d: "M 156 300 L 156 132",
        hit: { x: 156, y: 230 },
        pts: gassa1,
        hit3: V(156, 230, 0),
      },
      {
        title: "La tana",
        text: "Col corrente fai un occhio sulla dormiente: la tana, con il verso che guarda il corrente.",
        kind: "working",
        d: "M 156 132 C 156 92 108 92 108 132 C 108 164 156 164 156 132",
        hit: { x: 108, y: 132 },
        pts: gassa2,
        hit3: V(108, 132, 0.4),
        cross: { at: 0.55, label: "OCCHIO VERSO IL CORRENTE", pos: V(108, 132, 0.6) },
      },
      {
        title: "Il coniglio esce",
        text: "Il corrente sale da sotto e passa dentro la tana, verso di te.",
        kind: "working",
        d: "M 86 268 L 86 156 C 98 128 128 116 156 132",
        hit: { x: 86, y: 188 },
        pts: gassa3,
        hit3: V(86, 188, 0.4),
        gate: { pos: V(108, 132, 0.55), r: 1.7 },
        cross: { at: 0.6, label: "SU DALLA TANA", pos: V(110, 134, 0.9) },
      },
      {
        title: "Gira l'albero",
        text: "Il coniglio gira dietro la dormiente (l'albero) e torna verso la tana.",
        kind: "working",
        d: "M 156 132 C 188 122 196 88 170 70 C 154 58 150 88 156 112",
        hit: { x: 184, y: 84 },
        pts: gassa4,
        hit3: V(184, 84, -0.9),
        cross: { at: 0.3, label: "DIETRO L'ALBERO", pos: V(184, 84, -0.9) },
      },
      {
        title: "Rientra e stringi",
        text: "Di nuovo nella tana, giù. Tira dormiente e corrente: l'occhio grande non deve scorrere.",
        kind: "working",
        d: "M 156 112 C 136 128 114 146 92 168 L 78 214",
        hit: { x: 108, y: 158 },
        pts: gassa5,
        hit3: V(108, 158, 0.8),
        gate: { pos: V(108, 132, 0.55), r: 1.7 },
        cross: { at: 0.25, label: "GIÙ NELLA TANA", pos: V(118, 138, 0.7) },
      },
    ],
  },
  {
    id: "nodo-parlato",
    name: "Nodo parlato",
    english: "Clove hitch",
    level: 2,
    why: "Fissa una cima a un palo, una bitta, un candeliere. Veloce, regolabile.",
    onBoat: "Parabordi, palo dello scivolo, asta. Non è il nodo migliore se tira e slacca a raffiche.",
    warn: "Su un tubo liscio, se il tiro cambia senso, può girare. Completa con un mezzo collo se deve tenere.",
    quizUse: "Quale nodo metti in fretta intorno a un palo o a un parabordo?",
    object: "pole",
    steps: [
      {
        title: "Palo",
        text: "Il palo (o la bitta) sta fermo. Parti dal basso con il corrente.",
        kind: "standing",
        d: "M 64 300 L 64 200",
        hit: { x: 64, y: 250 },
        pts: parlato1,
        hit3: [-5.6, -7, 0],
      },
      {
        title: "Prima volta",
        text: "Giro completo intorno al palo, tornando dallo stesso lato da cui sei partito.",
        kind: "working",
        d: "M 64 200 C 64 168 196 168 196 200 C 196 232 64 232 64 200",
        hit: { x: 196, y: 200 },
        pts: parlato2,
        hit3: [parlatoR, -2.0, 0],
        cross: { at: 0.5, label: "GIRO COMPLETO, STESSO LATO", pos: [parlatoR, -2.3, 0] },
      },
      {
        title: "Seconda volta",
        text: "Un secondo giro, più in alto, nello stesso senso. I due giri si incrociano a X sul davanti.",
        kind: "working",
        d: "M 64 200 C 64 136 196 136 196 108",
        hit: { x: 196, y: 136 },
        pts: parlato3,
        hit3: [parlatoR, 0.1, 0],
        cross: { at: 0.45, label: "SOPRA LA PRIMA VOLTA", pos: [parlatoR, 0.1, 0] },
      },
      {
        title: "Sotto l'incrocio",
        text: "Il corrente passa sotto la X e si tira. I due colli si bloccano a vicenda.",
        kind: "working",
        d: "M 196 108 C 196 78 86 78 78 118 L 72 156",
        hit: { x: 78, y: 118 },
        pts: parlato4,
        hit3: [-0.4, 1.35, -2.4],
        gate: { pos: [-0.6, 1.2, -2.2], r: 1.1 },
        cross: { at: 0.5, label: "SOTTO LA X", pos: [-0.4, 1.35, -2.4] },
      },
    ],
  },
  {
    id: "giro-morto",
    name: "Giro morto e due mezzi colli",
    english: "Round turn and two half hitches",
    level: 2,
    why: "Ormeggio classico a un anello: il giro morto prende il carico, i mezzi colli tengono.",
    onBoat: "Anello di banchina, gassa di un'altra cima, bitta bassa. Il nodo da ormeggio del gommone.",
    warn: "I mezzi colli vanno sulla dormiente, non sull'anello. Stringi sotto carico.",
    quizUse: "Quale nodo usi per ormeggiare a un anello, col carico sul giro e il fermo a colli?",
    object: "ring",
    objectPos: [0, ringY, 0],
    objectR: ringR,
    steps: [
      {
        title: "Anello",
        text: "Passa il corrente nell'anello. La dormiente resta verso il gommone.",
        kind: "standing",
        d: "M 130 300 L 130 118",
        hit: { x: 130, y: 220 },
        pts: giro1,
        hit3: [0, -6, 0],
        gate: { pos: [0, ringY - ringR - 0.5, 0], r: 1.6 },
      },
      {
        title: "Giro morto",
        text: "Un giro e mezzo intorno all'anello: il metallo beve lo strappo, non il nodo.",
        kind: "working",
        d: "M 130 118 C 86 118 70 78 104 56 C 150 30 196 58 176 98 C 162 124 130 118 130 118",
        hit: { x: 78, y: 78 },
        pts: giro2,
        hit3: giro2[Math.floor(giro2.length / 2)],
        cross: { at: 0.5, label: "UN GIRO E MEZZO", pos: [0, ringY, 0] },
      },
      {
        title: "Primo mezzo collo",
        text: "Col corrente fai un mezzo collo intorno alla dormiente, sotto l'anello.",
        kind: "working",
        d: "M 176 98 C 200 130 168 168 130 168 C 108 168 108 196 130 196",
        hit: { x: 188, y: 140 },
        pts: giro3,
        hit3: [1.85, -0.9, 0],
        cross: { at: 0.4, label: "SOPRA LA DORMIENTE", pos: [1.85, -0.9, 0] },
      },
      {
        title: "Secondo mezzo collo",
        text: "Un secondo mezzo collo, stesso senso. Tira. Deve copiare il parlato sulla dormiente.",
        kind: "working",
        d: "M 130 196 C 162 196 168 230 130 236 C 98 242 92 268 118 278 L 148 286",
        hit: { x: 130, y: 236 },
        pts: giro4,
        hit3: [1.85, -3.0, 0],
        cross: { at: 0.4, label: "SOPRA LA DORMIENTE", pos: [1.85, -3.0, 0] },
      },
    ],
  },
  {
    id: "nodo-bandiera",
    name: "Nodo bandiera",
    english: "Sheet bend",
    level: 2,
    why: "Unisce due cime, anche di diametro diverso. Il nodo giusto al posto del nodo piano.",
    onBoat: "Allungare un ormeggio, unire una cima nuova a una vecchia, scotta su una randa di fortuna.",
    warn: "Il corrente della cima più sottile deve uscire dalla stessa parte della dormiente della più grossa.",
    quizUse: "Quale nodo usi per unire due cime, anche se una è più grossa?",
    object: "bight",
    objectPts: bightPts,
    steps: [
      {
        title: "Asola sulla grossa",
        text: "La cima più grossa (crema) fa solo un'asola. Non la nodare.",
        kind: "standing",
        d: "M 48 300 L 48 92",
        hit: { x: 48, y: 210 },
        pts: band1,
        hit3: V(48, 210, 0),
      },
      {
        title: "La sottile entra",
        text: "Il corrente della cima più sottile (arancio) entra nell'asola dal basso.",
        kind: "working",
        d: "M 210 300 L 210 150 C 200 118 150 108 118 118",
        hit: { x: 210, y: 210 },
        pts: band2,
        hit3: V(210, 210, 0.15),
        gate: { pos: V(118, 112, 0.3), r: 2 },
        cross: { at: 0.7, label: "DENTRO L'ASOLA", pos: V(118, 118, 0.5) },
      },
      {
        title: "Gira l'asola",
        text: "Gira dietro entrambi i capi dell'asola, un giro solo.",
        kind: "working",
        d: "M 118 118 C 78 128 58 88 92 68 C 128 46 168 68 168 108",
        hit: { x: 88, y: 72 },
        pts: band3,
        hit3: V(88, 72, -1.0),
        cross: { at: 0.3, label: "DIETRO ENTRAMBI I CAPI", pos: V(92, 70, -1.0) },
      },
      {
        title: "Sotto se stessa",
        text: "Il corrente passa sotto di sé, dentro l'asola, e si tira. I due capi corti escono dallo stesso lato.",
        kind: "working",
        d: "M 168 108 C 168 138 138 148 118 132 L 118 118",
        hit: { x: 148, y: 140 },
        pts: band4,
        hit3: V(148, 140, 0.7),
        gate: { pos: V(142, 134, 0.5), r: 1.4 },
        cross: { at: 0.55, label: "SOTTO SE STESSA", pos: V(148, 140, 0.7) },
      },
    ],
  },
]

export function getKnot(id) {
  return KNOTS.find((k) => k.id === id) || null
}
