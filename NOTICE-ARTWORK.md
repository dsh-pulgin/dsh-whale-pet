# Artwork notice

The pose images in `lib/assets/` are derivative works of a community
whale-girl character and are **not** original artwork of this plugin.

## Attribution

- Original character creator: 上善无形 — <https://space.bilibili.com/4456176>
- Asset publisher / adapter: Small-tailqwq — <https://github.com/Small-tailqwq>
- Upstream artwork repository (folders `maid-atelier`):
  <https://github.com/Small-tailqwq/dsh-deep-whale/tree/825d02b0e569c370ae15ceed12d9393559b3e4f4/maid-atelier>
- Collected and normalized by AI Moe Atlas, entry "鲸鱼娘 · 深海女仆工坊":
  <https://selinlee.github.io/ai-moe-atlas/zh/characters/deep-whale-maid/>
- Original publication referenced by the atlas:
  <https://www.bilibili.com/opus/1231977657712771073>

## License

CC BY-NC-SA 4.0 — <https://creativecommons.org/licenses/by-nc-sa/4.0/>

In short: attribution is required, **commercial use is not permitted**, and
derivatives must carry the same license. Using this plugin for work that is
commercially distributed requires permission from the rights holders. If you
need a commercially usable pet, replace the images in `lib/assets/` with
artwork you are allowed to redistribute and update `POSE_FILES` in
`client.js`.

## Changes made for this plugin

| Plugin file | Origin | License |
| --- | --- | --- |
| `lib/assets/whale-idle-6bdaf4bf8794.png` | upstream `assets/icons/sleepy-cutout.png` (困倦) | CC BY-NC-SA 4.0 |
| `lib/assets/whale-happy-a3bd65a9b06b.png` | upstream `assets/icons/delighted-cutout.png` (开心) | CC BY-NC-SA 4.0 |
| `lib/assets/whale-eating-d5ae447c7b60.png` | supplied by the user, provenance not verified | see below |

Filenames carry a content revision because the package-asset route serves them
with an immutable cache whose ETag is the path itself: replacing artwork means
renaming the file and updating `POSE_FILES`, never overwriting in place.

The two upstream files were cropped to their visible content (transparent
padding removed), downscaled with a box filter, and re-encoded as PNG. The
character design, colors, and pose are unchanged.

### About `whale-eating.png`

This pose was **provided by the user** and its source and license are not known
to this plugin. It is not part of the CC BY-NC-SA 4.0 upstream set credited
above, so that attribution does not cover it. The user is responsible for
holding the rights to use and redistribute it; replace it before publishing the
bundle if you cannot.

Only mechanical changes were made (`artwork-originals/key-background.cjs`): the
uploaded JPEG was decoded to PNG, its opaque white backdrop was keyed out by a
border flood fill with a one-pixel fringe removal and a softened edge, the cut
bottom edge was faded out, and the result was downscaled and re-encoded. Nothing
was repainted.

Earlier working-pose candidates are not shipped: an original chibi drawing and a
composite of the licensed full-body illustration. The scripts that produced
every asset and the README illustrations are in [`tools/`](tools/):
`key-background.cjs` (background keying), `compose-eating.cjs` (composite),
`draw-chibi.cjs` (original chibi), `make-readme-images.ps1` (README art), on
top of `png-tools.cjs` / `draw-tools.cjs`. To bring a candidate back, add it
under `lib/assets/` with a fresh revision suffix and point `POSE_FILES.working`
at that name.

`icon.svg` and `docs/preview.svg` are original drawings made for this plugin;
they may be reused freely.

## Other artwork tried, kept outside the package

The 130 px "determined" face (`whale-working.png`) and a rear-view full-body
repair pose from the same repository's `orca-link` folder are no longer
shipped. Their sources stay in `artwork-originals/`
(`whale-working-source.png`, `whale-busy-source.png`) so either can be restored
by copying it into `lib/assets/` and pointing `POSE_FILES.working` at it.
