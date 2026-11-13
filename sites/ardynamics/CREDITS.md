# Credits

The scene shaders, the temple, the saucer, the turtle, the kelp, and the copy in this site are original. The rigged fish and the scanned shell are the downloads named below.

## Techniques adapted from ThreeUI Community

The parent repository is MIT-licensed application code. These Community shaders were read and the ideas below were rewritten for water, glass, and bioluminescence. The original files were not copied in.

- Fresnel rim. `src/shaders/liquid-form/liquidFormShaders.ts` uses `pow(1.0 - max(dot(n, -rd), 0.0), 4.0)`. `src/shaders/animated-top-dock/glassParticleField.ts` uses `pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4)`. Water uses Schlick with an air-water F0 of 0.02 and an exponent of 5. Domes, the craft, fish, and jellies use the 3.4 glass exponent as a wet rim.
- Per-channel refraction offsets. The glass-bead shader samples the backdrop three times with slightly different IOR offsets. The water surface does the same to its refraction target, with a much smaller offset, so the reef fringes instead of splitting apart.
- Glow falloff. `src/shaders/emerald-horizon/emeraldHorizonShaders.ts` shapes intensity with `pow(intensity, 1.5)`. Jelly bodies use that curve so the light falls off instead of sitting as a flat add.

## Fonts

SIL Open Font License 1.1. The license text ships at `public/FONT-OFL.txt` and is part of the built site.

- Instrument Serif. Copyright 2022 The Instrument Serif Project Authors. https://github.com/Instrument/instrument-serif
- Newsreader. Copyright 2020 The Newsreader Project Authors. https://github.com/productiontype/Newsreader
- Fragment Mono. Copyright 2022 The Fragment-Mono Project Authors. https://github.com/weiweihuanghuang/fragment-mono

The files are the copies already in this repository (`public/sketchbook/` and `src/shaders/fonts/`). Lexend and Onest are in the parent notice and are not shipped here.

## HDRI and PBR textures

CC0, Poly Haven (https://polyhaven.com). No attribution is required; these are named so the files can be traced.

- `public/hdri/sunset.hdr` — Kiara 1 Dawn, 1K HDR, an open sky so the horizon stays ocean. https://polyhaven.com/a/kiara_1_dawn
- `public/textures/sand_*.jpg` — Aerial Sand, 1K. https://polyhaven.com/a/aerial_sand
- `public/textures/rock_*.jpg` — Rock Face, 1K. https://polyhaven.com/a/rock_face
- `public/textures/marble_*.jpg` — Marble 012, 1K albedo, OpenGL normal, and roughness. CC0, ambientCG. https://ambientcg.com/view?id=Marble012
- `public/textures/gold_*.jpg` — Metal 034, 1K albedo, OpenGL normal, roughness, and metalness, used on the temple trim. CC0, ambientCG. https://ambientcg.com/view?id=Metal034

## Sea-life models

CC0 1.0, Quaternius, via the fan mirror at https://github.com/trebeljahr/quaternius-showcase (models remain Quaternius’s; the showcase code is not used). Pack pages: https://quaternius.com/packs/animatedfish.html and the cute fish pack on https://poly.pizza/bundle/Animated-Fish-Bundle-44zhHN1UbT

- Blue tang, clownfish, yellow tang, parrotfish: cute fish pack, skinned, clip `Fish_Armature|Swimming_Normal`
- Manta ray, whale, shark, dolphin: animated fish pack, skinned, clip `Armature|Swim`

These are stylized low-poly models, not photogrammetry. They are the rigged CC0 sea life that could be fetched without an account. No CC0 rigged turtle or jellyfish GLB was reachable from Poly Haven, the Quaternius packs, or unauthenticated Sketchfab, so the turtle, the jellyfish, the branching coral, and the kelp are original meshes. The dolphin file is on disk and is not placed in the scene.

## Scanned shell

CC0, Poly Haven. Lambis shell photogrammetry, 1K glTF. https://polyhaven.com/a/lambis_shell

## Software

- three.js — MIT. https://github.com/mrdoob/three.js
- React and React DOM — MIT
- Vite — MIT
- @react-three/fiber — MIT
- postprocessing and @react-three/postprocessing — MIT

The research notes in `RESEARCH.md` name the ocean-shading papers and demos the lighting is aimed at. Those projects are not included in this build.
