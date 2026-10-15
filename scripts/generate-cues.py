#!/usr/bin/env python3
"""Generate the app's four offline cues with AWS CLI credentials from the environment.

python scripts/generate-cues.py --receipts-dir /private/path/polly-cues
python scripts/generate-cues.py --check
Add --force to replace cached audio. AWS CLI and ffprobe must be on PATH.
"""

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "evidence/polly-cues.json"
CUES = {
    "ready": "Ready. Make room.",
    "practice": "Your turn.",
    "watch": "Watch the movement.",
    "complete": "Practice complete. See you tomorrow.",
}


def probe(path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,sample_rate,channels:format=duration",
        "-of", "json", str(path),
    ], capture_output=True, text=True, check=True, timeout=15)
    info = json.loads(result.stdout)
    stream = info["streams"][0]
    assert stream["codec_name"] == "mp3", str(path)
    assert int(stream["sample_rate"]) == 24000 and stream["channels"] == 1, str(path)
    assert 0 < float(info["format"]["duration"]) < 8, str(path)
    return info


def write_json(path, value, private=False):
    path.write_text(json.dumps(value, indent=2) + "\n")
    path.chmod(0o600 if private else 0o644)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aws-cli", default="aws", help="AWS CLI executable")
    parser.add_argument("--region", default=os.environ.get("AWS_REGION", "ap-southeast-2"))
    parser.add_argument("--receipts-dir", type=Path, help="Private request and response directory")
    parser.add_argument("--force", action="store_true", help="Regenerate all four cues")
    parser.add_argument("--check", action="store_true", help="Check local assets; performs zero AWS calls")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    settings = {
        "service": "Amazon Polly", "region": args.region, "voice": "Joanna",
        "engine": "neural", "language": "en-US", "format": "mp3", "sample_rate_hz": 24000,
    }
    old_settings = {key: manifest.get(key) for key in settings}
    cues = manifest.get("cues", {})

    for name, text in CUES.items():
        target = ROOT / f"assets/raw/cue-{name}.mp3"
        cached = target.exists() and target.stat().st_size > 0
        metadata = cues.get(name, {})
        if args.check or (cached and not args.force):
            if old_settings != settings or metadata.get("text") != text:
                parser.error(f"{name}: metadata changed; use --force to regenerate")
            assert metadata["file"] == str(target.relative_to(ROOT))
            assert metadata["generated_at"]
            info = probe(target)
            print(f"{name}: cached MP3, {info['format']['duration']} s")
            continue

        if args.receipts_dir is None:
            parser.error("--receipts-dir is required when generating audio")
        args.receipts_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        args.receipts_dir.chmod(0o700)
        at = datetime.now(timezone.utc)
        stem = args.receipts_dir / f"{at.strftime('%Y%m%dT%H%M%S%fZ')}-{name}"
        audio = stem.with_suffix(".mp3")
        receipt_path = stem.with_suffix(".json")
        command = [
            args.aws_cli, "polly", "synthesize-speech", str(audio),
            "--region", args.region, "--voice-id", "Joanna", "--engine", "neural",
            "--language-code", "en-US", "--text-type", "text", "--text", text,
            "--output-format", "mp3", "--sample-rate", "24000", "--output", "json",
        ]
        receipt = {"cue": name, "text": text, "requested_at": at.isoformat(),
                   "request_characters": len(text), "command": command, "status": "started"}
        write_json(receipt_path, receipt, private=True)
        result = subprocess.run(command, capture_output=True, text=True, timeout=70,
                                env={**os.environ, "AWS_PAGER": "", "AWS_MAX_ATTEMPTS": "1"})
        receipt.update(returncode=result.returncode, stdout=result.stdout, stderr=result.stderr,
                       completed_at=datetime.now(timezone.utc).isoformat(),
                       status="completed" if result.returncode == 0 else "failed")
        write_json(receipt_path, receipt, private=True)
        result.check_returncode()
        response = json.loads(result.stdout)
        assert response["ContentType"] == "audio/mpeg"
        assert response["RequestCharacters"] == len(text)
        info = probe(audio)
        receipt["audio"] = info
        write_json(receipt_path, receipt, private=True)
        audio.replace(target)
        target.chmod(0o644)
        cues[name] = {"file": str(target.relative_to(ROOT)), "text": text,
                      "generated_at": at.isoformat()}
        write_json(MANIFEST, {**settings, "cues": cues})
        print(f"{name}: generated MP3, {info['format']['duration']} s, {len(text)} characters")


if __name__ == "__main__":
    main()
