#!/usr/bin/env python3
"""
Scans content/ and writes data/manifest.json.

Authoring rules
---------------
content/<NN-card-id>/
    card.md     card title + intro blurb (front matter: title, description)
    1.mp4       slide 1 media   (number = order, extension = type)
    1.md        slide 1 text    (front matter: title, journal, journal_link,
                                 description, alt)
    2.png
    2.md
    ...

A slide needs a media file to appear. A .md with no matching media is skipped
with a warning. Media with no matching .md renders with empty text.
Optional poster frames for video: NN-poster.jpg / NN-poster.webp

Any front-matter field beyond title/journal/journal_link/description/alt is
passed through automatically and rendered as a small "Label: value" line
under the slide description — e.g. add `data: "Jane Doe"` or
`analysis: "Jane Doe"` to credit who collected/analyzed that dataset. No
code change needed to add a new field; the label is the key, title-cased.

Run locally with `python build.py`, or let the GitHub Action run it on push.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

CONTENT_DIR = "content"
OUTPUT = os.path.join("data", "manifest.json")

VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}
IMAGE_EXT = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".tif", ".tiff"}

KNOWN_SLIDE_FIELDS = {"title", "journal", "journal_link", "description", "alt"}

warnings = []


def format_label(key):
    """'data_collection' -> 'Data Collection'; 'analysis' -> 'Analysis'."""
    return " ".join(w.capitalize() for w in key.replace("_", " ").replace("-", " ").split())


# --------------------------------------------------------------------------
# front matter + tiny markdown
# --------------------------------------------------------------------------

def parse_front_matter(text):
    """Return (dict_of_fields, body_text). Front matter is a --- delimited
    block of `key: value` lines at the top of the file."""
    fields, body = {}, text

    if text.lstrip().startswith("---"):
        stripped = text.lstrip()
        end = stripped.find("\n---", 3)
        if end != -1:
            block = stripped[3:end]
            body = stripped[end + 4:].lstrip("\n")
            key = None
            for line in block.splitlines():
                if not line.strip():
                    continue
                # continuation line: indented, belongs to the previous key
                if line[:1] in " \t" and key:
                    fields[key] = (fields[key] + " " + line.strip()).strip()
                    continue
                if ":" in line:
                    key, value = line.split(":", 1)
                    key = key.strip().lower()
                    fields[key] = unquote(value.strip())

    return fields, body.strip()


def unquote(value):
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def md_to_html(text):
    """Deliberately minimal: paragraphs, links, bold, italic, inline code."""
    if not text:
        return ""

    def inline(s):
        s = (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                   r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
        s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
        return s

    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    return "".join(f"<p>{inline(b)}</p>" for b in blocks)


# --------------------------------------------------------------------------
# scanning
# --------------------------------------------------------------------------

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def media_type(ext):
    if ext in VIDEO_EXT:
        return "video"
    if ext in IMAGE_EXT:
        return "image"
    return None


def find_poster(folder, stem, files):
    for ext in (".webp", ".jpg", ".jpeg", ".png"):
        name = f"{stem}-poster{ext}"
        if name in files:
            return f"{CONTENT_DIR}/{folder}/{name}"
    return None


def build_card(folder):
    path = os.path.join(CONTENT_DIR, folder)
    files = sorted(os.listdir(path))

    card = {"id": folder, "title": folder, "description": "", "body_html": "",
            "slides": []}

    if "card.md" in files:
        fields, body = parse_front_matter(read(os.path.join(path, "card.md")))
        card["title"] = fields.get("title") or folder
        card["description"] = fields.get("description", "")
        card["body_html"] = md_to_html(body)
    else:
        warnings.append(f"{folder}: no card.md, using folder name as title")

    # group files by numeric stem
    slides = {}
    for name in files:
        stem, ext = os.path.splitext(name)
        ext = ext.lower()
        if "-poster" in stem or not stem.isdigit():
            continue
        n = int(stem)
        entry = slides.setdefault(n, {"media": None, "ext": None, "md": None})
        if ext == ".md":
            entry["md"] = name
        elif media_type(ext):
            if entry["media"] and media_type(entry["ext"]) == media_type(ext):
                warnings.append(
                    f"{folder}/{name}: slide {n} already has media "
                    f"({entry['media']}), ignoring")
                continue
            entry["media"], entry["ext"] = name, ext

    for n in sorted(slides):
        entry = slides[n]

        if not entry["media"]:
            warnings.append(f"{folder}/{n}.md: no media file for slide {n}, skipped")
            continue

        fields = {}
        body_html = ""
        if entry["md"]:
            fields, body = parse_front_matter(read(os.path.join(path, entry["md"])))
            body_html = md_to_html(body)
        else:
            warnings.append(f"{folder}/{entry['media']}: no {n}.md, text will be empty")

        extra = [{"label": format_label(k), "value": v}
                 for k, v in fields.items()
                 if k not in KNOWN_SLIDE_FIELDS and v]

        stem = str(n)
        card["slides"].append({
            "n": n,
            "type": media_type(entry["ext"]),
            "src": f"{CONTENT_DIR}/{folder}/{entry['media']}",
            "poster": find_poster(folder, stem, files),
            "title": fields.get("title", ""),
            "journal": fields.get("journal", ""),
            "journal_link": fields.get("journal_link", ""),
            "description": fields.get("description", ""),
            "alt": fields.get("alt", fields.get("title", "")),
            "body_html": body_html,
            "extra": extra,
        })

    if not card["slides"]:
        warnings.append(f"{folder}: no slides with media yet")

    return card


def main():
    if not os.path.isdir(CONTENT_DIR):
        sys.exit(f"error: no {CONTENT_DIR}/ directory found")

    folders = sorted(d for d in os.listdir(CONTENT_DIR)
                     if os.path.isdir(os.path.join(CONTENT_DIR, d))
                     and not d.startswith("."))

    cards = [build_card(f) for f in folders]

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({
            "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "cards": cards,
        }, f, indent=2, ensure_ascii=False)
        f.write("\n")

    total = sum(len(c["slides"]) for c in cards)
    print(f"wrote {OUTPUT}: {len(cards)} cards, {total} slides")
    for w in warnings:
        print(f"  warning: {w}")


if __name__ == "__main__":
    main()
