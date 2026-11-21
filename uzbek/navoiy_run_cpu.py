"""Navoiy TTS on CPU (adapted from the repo's inference.py: CUDA check removed, fp16 off). Reads lines from a JSON
list of {"text","emotion"} and writes one WAV per line. Usage: python run_cpu.py <lines.json> <outdir> [reference.wav]"""
import json, sys, time, random
from pathlib import Path
R = Path(__file__).resolve().parent
sys.path.insert(0, str(R / "CosyVoice")); sys.path.insert(0, str(R / "CosyVoice/third_party/Matcha-TTS")); sys.path.insert(0, str(R))
import torch, torchaudio
from cosyvoice.cli.cosyvoice import CosyVoice2
from uztts.normalize import normalize
lines = json.load(open(sys.argv[1])); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ref = sys.argv[3] if len(sys.argv) > 3 else str(R / "CosyVoice/asset/zero_shot_prompt.wav")
emo = {}
for e in json.load(open(R / "emotions_40h.json")):
    emo[e["uz"].lower()] = e
    for tag in e["tag"].replace("[", " ").replace("]", " ").split(): emo[tag.lower()] = e
torch.set_num_threads(4)
model = CosyVoice2(str(R / "base"), load_jit=False, load_trt=False, fp16=False)
st = torch.load(R / "navoiy.pt", map_location="cpu", weights_only=True)
for k in ("state_dict", "model", "llm"):
    if isinstance(st, dict) and isinstance(st.get(k), dict): st = st[k]
print(model.model.llm.load_state_dict(st, strict=False), flush=True)
model.model.llm.eval()
for i, l in enumerate(lines):
    f = out / f"l{i:02d}.wav"
    if f.exists(): continue
    random.seed(1986 + i); torch.manual_seed(1986 + i)
    t0 = time.time(); chunks = []
    with torch.inference_mode():
        for r in model.inference_instruct2(normalize(l["text"], mode="infer"), emo[l.get("emotion", "calm")]["instruct"].strip() + "<|endofprompt|>", ref, stream=False, speed=l.get("speed", 1.0)):
            chunks.append(r["tts_speech"].cpu())
    a = torch.cat(chunks, 1); torchaudio.save(str(f), a, 24000)
    print(f"{i} {a.shape[-1]/24000:.2f}s audio in {time.time()-t0:.1f}s", flush=True)
