"""Build the deployable Sbarco graph as a current wiki projection of Graphify.

The runtime graph is deliberately a navigation index. It contains Graphify
nodes and edges whose source is under ``wiki/``; factual content is always
re-read from the referenced Markdown page by the Worker.
"""

from __future__ import annotations

import json
from pathlib import Path


SOURCE = Path("graphify-out/graph.json")
OUTPUTS = (Path("graphify-out/sbarco-graph.json"), Path("worker/graph.json"))
EXCLUDED_PAGES = {"wiki/log.md"}
NODE_FIELDS = {
    "id", "label", "file_type", "source_file", "source_location", "_origin", "norm_label",
}
LINK_FIELDS = {
    "source", "target", "relation", "confidence", "confidence_score",
    "source_file", "source_location", "weight", "_origin",
}


def endpoint_id(value):
    return str(value.get("id", "")) if isinstance(value, dict) else str(value or "")


def compact(item, allowed):
    return {key: value for key, value in item.items() if key in allowed and value not in (None, "")}


def main() -> None:
    graph = json.loads(SOURCE.read_text(encoding="utf-8"))
    nodes = []
    for node in graph.get("nodes", []):
        source = str(node.get("source_file", "")).replace("\\", "/")
        if not source.startswith("wiki/") or source in EXCLUDED_PAGES:
            continue
        compacted = compact(node, NODE_FIELDS)
        compacted["source_file"] = source
        nodes.append(compacted)

    node_ids = {str(node["id"]) for node in nodes}
    links = []
    seen = set()
    for link in graph.get("links", []):
        source = endpoint_id(link.get("source"))
        target = endpoint_id(link.get("target"))
        if source not in node_ids or target not in node_ids:
            continue
        key = (source, target, str(link.get("relation", "")))
        if key in seen:
            continue
        seen.add(key)
        compacted = compact(link, LINK_FIELDS)
        compacted["source"] = source
        compacted["target"] = target
        links.append(compacted)

    payload = {
        "directed": bool(graph.get("directed", False)),
        "multigraph": False,
        "graph": {
            "projection": "graphify wiki runtime navigation",
            "source": str(SOURCE).replace("\\", "/"),
        },
        "nodes": nodes,
        "links": links,
        "hyperedges": [],
    }
    encoded = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    print(f"Sbarco graph projection: {len(nodes)} nodes, {len(links)} links -> {', '.join(map(str, OUTPUTS))}")


if __name__ == "__main__":
    main()
