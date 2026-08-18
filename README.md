# Personal research website

Static site for GitHub Pages. No frameworks, no npm, no build tooling beyond
one Python script.

## How to add content

Everything on the research page comes from the `content/` folder. One folder
per card:

```
content/01-in-situ-dynamics/
├── card.md      ← card title + intro blurb
├── 1.mp4        ← slide 1 media
├── 1.md         ← slide 1 text
├── 1-poster.jpg ← optional poster frame for video
├── 2.png
├── 2.md
└── ...
```

Three rules:

1. **The number is the order.** `1`, `2`, `3` … appear in that order.
2. **The extension is the type.** `.mp4/.webm/.mov` render as video,
   `.png/.jpg/.webp/.gif` as images.
3. **The matching `.md` is the text.** `1.md` describes `1.mp4`.

Card order on the page follows folder name, so keep the `NN-` prefix.

### `card.md`

```markdown
---
title: "In situ imaging of materials dynamics"
description: "One or two sentences, roughly fifty words, that set up the card."
---
```

Anything written below the closing `---` is rendered as extra paragraphs
under the intro. Leave it empty if you don't need it.

### `1.md` (one per slide)

```markdown
---
title: "Droplet nucleation in liquid-phase TEM"
journal: "Nature Communications"
journal_link: "https://doi.org/10.1038/..."
description: "What this dataset shows, in a sentence or two."
alt: "Screen-reader description of the image or video"
---
```

`journal` and `journal_link` are optional — leave them as `""` for
unpublished data. If `journal_link` is set the journal name becomes a link.

## Publishing a change

```
git add . && git commit -m "add dendrite dataset" && git push
```

A GitHub Action runs `build.py`, regenerates `data/manifest.json`, and commits
it back. The site updates about a minute later. You never edit
`manifest.json` by hand.

To preview locally first:

```
python build.py
python -m http.server 8000
# open http://localhost:8000
```

`build.py` prints warnings for common mistakes — a `.md` with no media, media
with no `.md`, a folder with nothing in it yet.

## Other content

| What | Where |
|---|---|
| Publication list | `data/publications.json` |
| Scholar / ORCID / LinkedIn / email | `data/links.json` |
| Colors, fonts, spacing | `assets/css/base.css` (the `:root` block) |
| Page copy outside the cards | `index.html`, `contact.html` |

## Media guidelines

GitHub Pages caps a published site at **1 GB** and any single file at
**100 MB**. Compress before committing:

```bash
# video → web-friendly H.264
ffmpeg -i raw.mov -vf "scale=1280:-2" -c:v libx264 -crf 24 -preset slow \
       -pix_fmt yuv420p -an 1.mp4

# poster frame
ffmpeg -i 1.mp4 -frames:v 1 1-poster.jpg

# stills → WebP
ffmpeg -i raw.tif -vf "scale=1600:-2" -quality 82 2.webp
```

Videos autoplay muted and looped, so keep them short (3–10 s) and drop the
audio track.

## Deploying

1. Push this folder to a repo named `<username>.github.io`.
2. Settings → Pages → Source: `main`, folder `/ (root)`.
3. Settings → Actions → General → Workflow permissions → **Read and write**
   (so the manifest Action can commit).

`.nojekyll` is already present so Pages serves the files as-is.

## Placeholder content

The generated micrographs in `content/*/` are placeholders — they are labelled
as such in the corner. Delete them as you add real data. Search for
`REPLACE_ME` in `data/links.json` and `data/publications.json` for the other
spots that need your details.
