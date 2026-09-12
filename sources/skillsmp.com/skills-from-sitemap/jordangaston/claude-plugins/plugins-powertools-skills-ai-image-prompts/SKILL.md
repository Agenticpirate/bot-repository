---

name: ai-image-prompts

description: "Turn a seed idea into a polished AI image-generation prompt using a 6-part structure: [medium], [subject], [action/pose], [environment], [style/vibe], [technical specs]. Use this skill whenever the user wants a prompt for generating an image with any model — Midjourney, DALL-E, Imagen, Nano Banana, Flux, Stable Diffusion, Freepik, or unnamed — or asks to 'write an image prompt,' 'make a prompt for this idea,' 'improve my image prompt,' or gives a rough visual idea ('a red panda barista,' 'cyberpunk samurai in the rain') and wants it image-ready. Also trigger when the user asks why their image prompts produce weak or inconsistent results. Covers any visual medium: photorealistic, digital painting, 3D render, anime, illustration, pixel art, watercolor, concept art, and more."

---
# AI Image Prompts

A method for expanding a seed idea into one high-quality image-generation prompt, from GenHQ's Seed2Prompt structure. It works for any visual medium — photoreal photo, digital painting, 3D render, anime, pixel art, concept art, watercolor — and any image model.

## The structure

When the user gives a seed idea (e.g., "fluffy red panda barista sipping coffee on a rock in an autumn forest," "cyberpunk samurai in rainy neon alley," "Victorian lady reading by candlelight"), output **one** prompt using exactly this 6-part comma-separated structure — nothing else, no explanations, no weights:

```
[medium], [subject], [action/pose], [environment], [style/vibe], [technical specs]
```

Fill each field concisely but vividly. Total prompt ideally **80–180 words**.

## The six fields

### [medium]

The primary visual technique / format that best fits the seed or desired look. Examples: photorealistic photograph, cinematic film still, digital painting, oil on canvas, 3D render Octane style, anime illustration, chibi cartoon, pixel art 16-bit, concept art matte painting, surreal digital collage, gouache illustration, charcoal sketch, low-poly 3D, watercolor, cyberpunk neon vector.

### [subject]

Main focus: who or what is central. Include key descriptors — species/gender/age/ethnicity if applicable, colors, textures, expression, distinctive features. Keep **10–30 words**. E.g. "adorable fluffy red panda with big shiny black eyes and tiny happy smile", "exhausted late-20s Latina showgirl with wet plastered hair and smudged makeup".

### [action/pose]

What the subject is doing + body language/emotion. **One clear, dynamic phrase.** E.g. "sitting relaxed on mossy rock sipping oversized coffee mug with both paws", "struggling with inside-out umbrella in violent wind, legs braced, hair whipping across face".

### [environment]

Setting + key visible elements + time/weather/atmosphere. Concise but evocative. E.g. "golden autumn forest outcrop with falling leaves and soft fog", "rain-soaked 1980s Times Square cabaret exterior at night, flickering neon 'Paradise Lounge', wet reflective pavement, steam vents".

### [style/vibe]

Overall aesthetic, mood, palette, influences. Combine art direction + emotional tone + color feel. Examples: "cozy whimsical warm golden-hour pastels, Pixar-like charm", "gritty urban noir, cool cyan-teal magenta neon bleed, faded 80s glamour and isolation", "vibrant cel-shaded anime energy, dramatic rim light", "dreamy soft surreal pastel haze", "high-contrast cinematic moody chiaroscuro".

### [technical specs]

Optional-to-medium enhancers: lighting summary, quality boosters, imperfections, render hints. Keep short (**2–6 items**), matched to the medium:

- **Photo:** "35mm f/1.8 shallow DoF creamy bokeh, rain droplets on lens, heavy film grain, light bloom"
- **3D/illustration:** "clean stylized render, soft rim + bounce lighting, gentle subsurface scattering, no grain"
- **Painting:** "visible brush strokes, rich impasto texture, soft focus edges"
- **Universal:** "high detail, sharp focus, vibrant colors, cinematic composition"

## Rules

- Output ONLY the comma-separated prompt.
- Display the prompt inside a Markdown code block so the user can copy it easily.
- Adapt medium/style/vibe naturally to the seed — don't force photo terms on non-photo ideas.
- Stay vivid, specific, story-driven but succinct.
- If the seed implies no subject, clothing, or action, adapt logically (e.g., a landscape seed → wide vista description in [subject]).

## Working with the user

- **One seed, one prompt.** If the user wants variations, produce each as its own complete 6-part prompt in its own code block.
- **Respect a stated medium.** If the user says "watercolor" or "3D render," that fixes [medium]; infer only what they left open.
- **Diagnosing weak prompts:** when a user's prompt underperforms, map it onto the six fields. The failure is usually a missing field — most often [action/pose] (static subjects) or [style/vibe] (generic look). Fill the gap rather than adding more adjectives to fields already covered.
