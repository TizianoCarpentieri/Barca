"""Transcribe WhatsApp PTT ogg files with faster-whisper + PyAV (no ffmpeg binary)."""
from __future__ import annotations

import sys
from pathlib import Path

import av
import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "raw" / "audio" / "whatsapp-2026-08-21"
OUT_MD = AUDIO_DIR / "TRASCRIZIONE.md"
SIDECAR_DIR = AUDIO_DIR / "_transcripts"
SR = 16000
PROMPT = (
    "Conversazione in italiano tra Tiziano e Antonio sul progetto barca: "
    "gommone, vela, Comet 770, porto, ormeggio, budget, patente nautica, "
    "pesca, soci, costi fissi, Lazio, Ardea, Pomezia, Anzio. "
    "Usa punteggiatura e a capo."
)


def load_audio(path: Path, sr: int = SR) -> np.ndarray:
    container = av.open(str(path))
    resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=sr)
    chunks: list[np.ndarray] = []
    for frame in container.decode(audio=0):
        resampled = resampler.resample(frame)
        if resampled is None:
            continue
        if not isinstance(resampled, (list, tuple)):
            resampled = [resampled]
        for f in resampled:
            arr = f.to_ndarray()
            if arr.ndim > 1:
                arr = arr.mean(axis=0) if arr.shape[0] < arr.shape[1] else arr.mean(axis=1)
            chunks.append(np.asarray(arr, dtype=np.int16).flatten())
    flushed = resampler.resample(None)
    if flushed is not None:
        if not isinstance(flushed, (list, tuple)):
            flushed = [flushed]
        for f in flushed:
            arr = f.to_ndarray()
            if arr.ndim > 1:
                arr = arr.mean(axis=0) if arr.shape[0] < arr.shape[1] else arr.mean(axis=1)
            chunks.append(np.asarray(arr, dtype=np.int16).flatten())
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    audio = np.concatenate(chunks).astype(np.float32) / 32768.0
    return audio


def main() -> int:
    files = sorted(AUDIO_DIR.glob("*.ogg"))
    if not files:
        print(f"No ogg files in {AUDIO_DIR}", file=sys.stderr)
        return 1
    SIDECAR_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Loading Whisper small (cpu int8) for {len(files)} files...", flush=True)
    model = WhisperModel("small", device="cpu", compute_type="int8")
    parts: list[str] = [
        "# Trascrizione WhatsApp 2026-08-20/21 — Tiziano e Antonio",
        "",
        "Fonte: `raw/audio/WhatsApp Unknown 2026-08-21 at 17.07.29.zip`.",
        "Modello: faster-whisper `small`, lingua `it`. Derivato, non originale.",
        "",
    ]
    for i, path in enumerate(files, 1):
        sidecar = SIDECAR_DIR / f"{path.stem}.txt"
        if sidecar.exists() and sidecar.stat().st_size > 0:
            text = sidecar.read_text(encoding="utf-8").strip()
            print(f"[{i}/{len(files)}] SKIP {path.name}", flush=True)
        else:
            audio = load_audio(path)
            if audio.size == 0:
                text = ""
                print(f"[{i}/{len(files)}] EMPTY {path.name}", flush=True)
            else:
                segments, info = model.transcribe(
                    audio,
                    language="it",
                    initial_prompt=PROMPT,
                    vad_filter=True,
                    beam_size=1,
                )
                text = " ".join(s.text.strip() for s in segments).strip()
                dur = audio.size / SR
                print(
                    f"[{i}/{len(files)}] {path.name} {dur:.1f}s -> {text[:90]!r}",
                    flush=True,
                )
            sidecar.write_text(text + ("\n" if text else ""), encoding="utf-8")
        stamp = path.stem.replace("WhatsApp Ptt ", "")
        parts.append(f"## {stamp}")
        parts.append("")
        parts.append(text if text else "_(vuoto)_")
        parts.append("")
    OUT_MD.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUT_MD}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
