"""
Build domain-specific graph.json from wiki/ content for the Sbarco chatbot.
Extracts entities and relationships from markdown wikilinks, frontmatter, and content.
"""
import json
import re
import os
from pathlib import Path

WIKI_DIR = Path("wiki")
OUTPUT = Path("graphify-out/graph.json")

# ── Collect all wiki .md files ──────────────────────────────────
md_files = sorted(WIKI_DIR.rglob("*.md"))

nodes = []
edges = []
seen_ids = set()
node_index = {}  # label → node

def add_node(label, file_type, source_file, source_location="L1", origin="semantic", **extra):
    """Add a node if its id doesn't already exist."""
    node_id = re.sub(r"[^a-z0-9_]+", "_", label.lower().strip()).strip("_")
    if not node_id or node_id in seen_ids:
        # try appending source
        slug = re.sub(r"[^a-z0-9_]+", "_", str(source_file).lower()).strip("_")
        node_id = f"{node_id}_{slug}"
    if node_id in seen_ids:
        return None
    seen_ids.add(node_id)
    node = {
        "id": node_id,
        "label": label,
        "file_type": file_type,
        "source_file": source_file,
        "source_location": source_location,
        "_origin": origin,
        "norm_label": label.lower(),
        **extra,
    }
    nodes.append(node)
    node_index[label.lower()] = node
    return node

def add_edge(source_label, target_label, relation, confidence="EXTRACTED", source_file="wiki/index.md", weight=1.0):
    s = node_index.get(source_label.lower())
    t = node_index.get(target_label.lower())
    if not s or not t:
        return None
    edge = {
        "source": s["id"],
        "target": t["id"],
        "relation": relation,
        "confidence": confidence,
        "source_file": source_file,
        "source_location": "L1",
        "weight": weight,
    }
    # deduplicate
    for e in edges:
        if e["source"] == edge["source"] and e["target"] == edge["target"] and e["relation"] == edge["relation"]:
            return None
    edges.append(edge)
    return edge

def parse_frontmatter(text):
    fm = {}
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if m:
        for line in m.group(1).split("\n"):
            line = line.strip()
            if ":" in line:
                key, val = line.split(":", 1)
                fm[key.strip()] = val.strip()
    return fm

def extract_wikilinks(text):
    return re.findall(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]", text)

# ── Root nodes ───────────────────────────────────────────────────
add_node("Progetto Barca", "project", "wiki/index.md")
add_node("Le Bestie", "group", "wiki/preferenze/gruppo.md")
add_node("Tiziano", "person", "wiki/preferenze/gruppo.md")
add_node("Antonio", "person", "wiki/preferenze/gruppo.md")
add_node("Peppe", "person", "wiki/preferenze/gruppo.md")
add_node("Ardea-Pomezia", "location", "wiki/preferenze/gruppo.md")
add_node("Mare Tirreno Laziale", "location", "wiki/preferenze/gruppo.md")
add_node("Anzio", "location", "wiki/mercato/litorale-laziale.md")
add_node("Nettuno", "location", "wiki/mercato/litorale-laziale.md")
add_node("Circeo", "location", "wiki/mercato/litorale-laziale.md")
add_node("Fiumicino", "location", "wiki/mercato/litorale-laziale.md")

# ── Track system ──────────────────────────────────────────────────
add_node("Dual Track", "concept", "wiki/overview.md")
add_node("Track A - Rigide", "concept", "wiki/overview.md")
add_node("Track B - Gommoni", "concept", "wiki/overview.md")
add_node("Track C - Motori", "concept", "wiki/overview.md")

add_edge("Dual Track", "Track A - Rigide", "contains")
add_edge("Dual Track", "Track B - Gommoni", "contains")
add_edge("Dual Track", "Track C - Motori", "contains")

# ── Budget ────────────────────────────────────────────────────────
add_node("Budget acquisto ≤4500€", "constraint", "wiki/preferenze/budget.md")
add_node("Budget gestione ≤1200€/testa/anno", "constraint", "wiki/preferenze/budget.md")
add_node("TCO 3600€/anno totale", "constraint", "wiki/preferenze/budget.md")
add_node("Solo usato", "preference", "wiki/preferenze/budget.md")

add_edge("Budget acquisto ≤4500€", "Progetto Barca", "constrains")
add_edge("Budget gestione ≤1200€/testa/anno", "Progetto Barca", "constrains")
add_edge("Solo usato", "Budget acquisto ≤4500€", "qualifies")

# ── Patente / Normativa ──────────────────────────────────────────
add_node("No patente nautica", "constraint", "wiki/preferenze/must-have.md")
add_node("Limite 40.8 CV (30 kW)", "regulation", "wiki/normativa/limiti-senza-patente.md")
add_node("Entro 6 miglia dalla costa", "regulation", "wiki/normativa/limiti-senza-patente.md")
add_node("Limiti cilindrata per tipo motore", "regulation", "wiki/normativa/limiti-senza-patente.md")
add_node("MIT - Ministero Infrastrutture e Trasporti", "authority", "wiki/normativa/limiti-senza-patente.md")

add_edge("No patente nautica", "Limite 40.8 CV (30 kW)", "requires")
add_edge("No patente nautica", "Entro 6 miglia dalla costa", "requires")
add_edge("Limite 40.8 CV (30 kW)", "MIT - Ministero Infrastrutture e Trasporti", "source")

# ── Modelli ───────────────────────────────────────────────────────
add_node("Argo-Evo 360 AL", "model", "wiki/modelli/argo-evo-360.md")
add_node("Prezzo 970€ nuovo", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Lunghezza 3.60 m", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Portata 475 kg", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Capienza 5 persone", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Peso 68 kg", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Pavimento alluminio", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Chiglia gonfiabile", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Motore max 20 HP", "spec", "wiki/modelli/argo-evo-360.md")
add_node("Gommone pneumatico non RIB", "type", "wiki/modelli/argo-evo-360.md")
add_node("Smontabile trasportabile auto", "feature", "wiki/modelli/argo-evo-360.md")
add_node("Garanzia 3 anni", "feature", "wiki/modelli/argo-evo-360.md")

add_edge("Argo-Evo 360 AL", "Prezzo 970€ nuovo", "has_spec")
add_edge("Argo-Evo 360 AL", "Lunghezza 3.60 m", "has_spec")
add_edge("Argo-Evo 360 AL", "Portata 475 kg", "has_spec")
add_edge("Argo-Evo 360 AL", "Capienza 5 persone", "has_spec")
add_edge("Argo-Evo 360 AL", "Peso 68 kg", "has_spec")
add_edge("Argo-Evo 360 AL", "Pavimento alluminio", "has_spec")
add_edge("Argo-Evo 360 AL", "Chiglia gonfiabile", "has_spec")
add_edge("Argo-Evo 360 AL", "Motore max 20 HP", "has_spec")
add_edge("Argo-Evo 360 AL", "Gommone pneumatico non RIB", "is_type")
add_edge("Argo-Evo 360 AL", "Smontabile trasportabile auto", "has_feature")
add_edge("Argo-Evo 360 AL", "Garanzia 3 anni", "has_feature")
add_edge("Argo-Evo 360 AL", "Track B - Gommoni", "belongs_to")
add_edge("Argo-Evo 360 AL", "Budget acquisto ≤4500€", "respects")

# ── Motori ────────────────────────────────────────────────────────
add_node("Motore fuoribordo 9.9-15 CV", "spec_range", "wiki/preferenze/track-motori.md")
add_node("Range 6-40.8 CV", "spec_range", "wiki/preferenze/track-motori.md")
add_node("Sweet spot 9.9-15 CV", "spec_range", "wiki/preferenze/track-motori.md")
add_node("Preferenza 4 tempi", "preference", "wiki/preferenze/track-motori.md")
add_node("Gambo corto", "spec", "wiki/preferenze/track-motori.md")
add_node("Budget motore ≤1200€", "constraint", "wiki/preferenze/track-motori.md")
add_node("Yamaha", "brand", "wiki/preferenze/track-motori.md")
add_node("Suzuki", "brand", "wiki/preferenze/track-motori.md")
add_node("Mercury", "brand", "wiki/preferenze/track-motori.md")
add_node("Tohatsu", "brand", "wiki/preferenze/track-motori.md")
add_node("Honda Marine", "brand", "wiki/preferenze/track-motori.md")

add_edge("Motore fuoribordo 9.9-15 CV", "Track C - Motori", "belongs_to")
add_edge("Sweet spot 9.9-15 CV", "Limite 40.8 CV (30 kW)", "respects")
add_edge("Budget motore ≤1200€", "Budget acquisto ≤4500€", "part_of")
add_edge("Argo-Evo 360 AL", "Sweet spot 9.9-15 CV", "compatible_with")

# ── Track A: Scafi Rigidi ────────────────────────────────────────
add_node("Gozzo", "type", "wiki/sintesi/requisiti-v1.md")
add_node("Open", "type", "wiki/sintesi/requisiti-v1.md")
add_node("Lancia VTR", "type", "wiki/sintesi/requisiti-v1.md")
add_node("No gommone su Track A", "constraint", "wiki/preferenze/must-have.md")
add_node("Tendalino", "feature", "wiki/concetti/tendalino-copertura.md")
add_node("Bimini aftermarket 150-600€", "spec", "wiki/concetti/tendalino-copertura.md")
add_node("No carrello", "constraint", "wiki/preferenze/must-have.md")

add_edge("Track A - Rigide", "Gozzo", "includes")
add_edge("Track A - Rigide", "Open", "includes")
add_edge("Track A - Rigide", "Lancia VTR", "includes")
add_edge("Track A - Rigide", "No gommone su Track A", "constrains")
add_edge("Track A - Rigide", "No carrello", "constrains")
add_edge("Track A - Rigide", "Tendalino", "recommends")
add_edge("Tendalino", "Bimini aftermarket 150-600€", "has_option")

# ── Track B: Gommoni ─────────────────────────────────────────────
add_node("Lunghezza min 3.30 m", "spec", "wiki/preferenze/track-gommoni.md")
add_node("Lunghezza ideale 3.50-3.80 m", "spec", "wiki/preferenze/track-gommoni.md")
add_node("Portata min 400 kg", "spec", "wiki/preferenze/track-gommoni.md")
add_node("Capienza min 4 persone", "spec", "wiki/preferenze/track-gommoni.md")
add_node("Regola -20% usato vs nuovo", "rule", "wiki/preferenze/track-gommoni.md")
add_node("USato gommone benchmark 776€", "spec", "wiki/preferenze/track-gommoni.md")

add_edge("Track B - Gommoni", "Lunghezza min 3.30 m", "requires")
add_edge("Track B - Gommoni", "Portata min 400 kg", "requires")
add_edge("Track B - Gommoni", "Regola -20% usato vs nuovo", "defines")
add_edge("Regola -20% usato vs nuovo", "USato gommone benchmark 776€", "derives")

# ── Rimessaggio ───────────────────────────────────────────────────
add_node("Posto barca (Opzione A)", "option", "wiki/confronti/rimessaggio-abc.md")
add_node("Cantiere a terra (Opzione C)", "option", "wiki/confronti/rimessaggio-abc.md")
add_node("Carrello escluso", "decision", "wiki/confronti/rimessaggio-abc.md")
add_node("Canone ormeggio 800-2000€/anno", "estimate", "wiki/preferenze/budget.md")
add_node("Varata+alaggio 300-1200€/anno", "estimate", "wiki/preferenze/budget.md")

add_edge("Posto barca (Opzione A)", "Canone ormeggio 800-2000€/anno", "costs")
add_edge("Cantiere a terra (Opzione C)", "Varata+alaggio 300-1200€/anno", "costs")
add_edge("Posto barca (Opzione A)", "Anzio", "location")
add_edge("Cantiere a terra (Opzione C)", "Anzio", "location")

# ── Pesca ─────────────────────────────────────────────────────────
add_node("Pesca a canna (priorità #1)", "activity", "wiki/concetti/pesca-da-barca-piccola.md")
add_node("Bolentino", "technique", "wiki/concetti/pesca-da-barca-piccola.md")
add_node("Surfcasting", "technique", "wiki/concetti/pesca-da-barca-piccola.md")
add_node("Traina leggera", "technique", "wiki/concetti/pesca-da-barca-piccola.md")
add_node("Portacanne aftermarket", "accessory", "wiki/concetti/pesca-da-barca-piccola.md")
add_node("Ecoscandaglio", "accessory", "wiki/preferenze/nice-to-have.md")

add_edge("Pesca a canna (priorità #1)", "Bolentino", "recommends")
add_edge("Pesca a canna (priorità #1)", "Portacanne aftermarket", "requires")
add_edge("Pesca a canna (priorità #1)", "Tendalino", "may_conflict_with")

# ── Scoring annunci ───────────────────────────────────────────────
add_node("Feed annunci Subito", "system", "wiki/concetti/feed-annunci-scoring.md")
add_node("Geo-score distanza Lazio", "rule", "wiki/concetti/feed-annunci-scoring.md")
add_node("Fattore Puglia x1.20", "rule", "wiki/concetti/feed-annunci-scoring.md")
add_node("Fattore Sicilia x1.30", "rule", "wiki/concetti/feed-annunci-scoring.md")
add_node("Fit label alto/medio/basso/stretch", "system", "wiki/concetti/feed-annunci-scoring.md")

add_edge("Feed annunci Subito", "Geo-score distanza Lazio", "uses")
add_edge("Geo-score distanza Lazio", "Fattore Puglia x1.20", "defines")
add_edge("Geo-score distanza Lazio", "Fattore Sicilia x1.30", "defines")

# ── Uso e priorità ───────────────────────────────────────────────
add_node("Giri costa", "activity", "wiki/preferenze/nice-to-have.md")
add_node("Bagno relax", "activity", "wiki/preferenze/nice-to-have.md")
add_node("3 persone comode pesca", "requirement", "wiki/preferenze/must-have.md")
add_node("Fino a 6 persone picco sociale", "requirement", "wiki/preferenze/must-have.md")

add_edge("Progetto Barca", "3 persone comode pesca", "requires")
add_edge("Progetto Barca", "Fino a 6 persone picco sociale", "aspires_to")

# ── Persone → Progetto ───────────────────────────────────────────
add_edge("Tiziano", "Progetto Barca", "member_of")
add_edge("Antonio", "Progetto Barca", "member_of")
add_edge("Peppe", "Progetto Barca", "member_of")
add_edge("Le Bestie", "Tiziano", "contains")
add_edge("Le Bestie", "Antonio", "contains")
add_edge("Le Bestie", "Peppe", "contains")

# ── Location ──────────────────────────────────────────────────────
add_edge("Ardea-Pomezia", "Mare Tirreno Laziale", "base")
add_edge("Mare Tirreno Laziale", "Anzio", "includes")
add_edge("Mare Tirreno Laziale", "Circeo", "includes")
add_edge("Mare Tirreno Laziale", "Fiumicino", "includes")
add_edge("Mare Tirreno Laziale", "Nettuno", "includes")

# ── Cross-track edges ─────────────────────────────────────────────
add_edge("Track B - Gommoni", "Argo-Evo 360 AL", "benchmark")
add_edge("Track B - Gommoni", "Smontabile trasportabile auto", "requires")
add_edge("Track C - Motori", "Preferenza 4 tempi", "recommends")
add_edge("Track C - Motori", "Gambo corto", "recommends")
add_edge("Track A - Rigide", "Posto barca (Opzione A)", "uses_rimessaggio")
add_edge("Track A - Rigide", "Cantiere a terra (Opzione C)", "uses_rimessaggio")
add_edge("Pesca a canna (priorità #1)", "Limite 40.8 CV (30 kW)", "constrained_by")
add_edge("Fino a 6 persone picco sociale", "Limite 40.8 CV (30 kW)", "constrained_by")

# ── Write all wiki pages as reference nodes ───────────────────────
for f in md_files:
    rel = str(f.relative_to(".")).replace("\\", "/")
    content = f.read_text(encoding="utf-8")
    fm = parse_frontmatter(content)
    title = fm.get("title", f.stem.replace("-", " ").title())
    page_type = fm.get("type", "page")
    tags = [t.strip() for t in fm.get("tags", "").strip("[]").split(",") if t.strip()]
    
    node = add_node(title, page_type, rel)
    if not node:
        continue
    
    # Extract wikilinks and create edges
    for link in extract_wikilinks(content):
        # Find target by filename
        target_file = link.strip()
        if not target_file.endswith(".md"):
            target_file += ".md"
        # Try to find matching node
        for n in nodes:
            if target_file.lower() in n.get("source_file", "").lower():
                add_edge(title, n["label"], "references", source_file=rel)
                break
    
    # Add tag edges
    for tag in tags:
        tag_node = add_node(f"#{tag}", "tag", rel)
        if tag_node:
            add_edge(title, f"#{tag}", "tagged", source_file=rel)

# ── Assicurazione / extra ────────────────────────────────────────
add_node("Assicurazione RC 150-400€/anno", "estimate", "wiki/preferenze/budget.md")
add_node("Manutenzione 150-600€/anno", "estimate", "wiki/preferenze/budget.md")
add_node("Carburante 200-500€/anno", "estimate", "wiki/preferenze/budget.md")
add_node("Riserva lavori post-acquisto 500-1500€", "recommendation", "wiki/mercato/usato-under-4500.md")

add_edge("TCO 3600€/anno totale", "Assicurazione RC 150-400€/anno", "includes")
add_edge("TCO 3600€/anno totale", "Manutenzione 150-600€/anno", "includes")
add_edge("TCO 3600€/anno totale", "Carburante 200-500€/anno", "includes")

# ── Output ────────────────────────────────────────────────────────
graph = {
    "directed": False,
    "multigraph": False,
    "graph": {},
    "nodes": nodes,
    "links": edges,
    "hyperedges": [],
}

os.makedirs(OUTPUT.parent, exist_ok=True)
OUTPUT.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Graph built: {len(nodes)} nodes, {len(edges)} edges")
