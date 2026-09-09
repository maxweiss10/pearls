# Bundled emoji artwork

Source: [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google. Per that repo's README, the SVG image
resources are under the Apache License 2.0 (LICENSE-APACHE); the repo's root license file (LICENSE, SIL OFL 1.1)
is included as distributed upstream.

Files are named exactly like Noto's `svg/` directory (`emoji_u<hex>[_<hex>].svg`, U+FE0F dropped) so the site can
fall back to the jsDelivr copy of Noto for any emoji not bundled here, and to the plain character after that.

Why: hospital Windows builds lack newer emoji glyphs entirely (🫀 🪪 🩸 rendered as boxes) and draw the rest with
different artwork. Serving the vectors ourselves makes the Resources icons identical on every OS.

When a resource gets a new emoji, drop its SVG in here:
  curl -sL https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u<hex>.svg -o icons/emoji/emoji_u<hex>.svg
