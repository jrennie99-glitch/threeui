# Research: what a 100/100 immersive site actually does

Studied 13 November 2026, before any scene code. Sources are award pages, studio case studies, technical teardowns, and the ocean-rendering references named in the brief. The scorecard at the bottom is the spec this site is built to.

The pattern across Site of the Year work is not "a 3D model on a page." It is one camera idea, carried without a cut, with type you can read, a load that feels intentional, sound that is part of the world, and a frame rate that never apologises.

## Reference sites

### 1. Lusion v3 — Awwwards Site of the Year 2023

- https://lusion.co
- Case study: https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html
- Teardown: https://rickcreates.com/r/2023-10-02-lusion-v3
- Studio notes: https://www.commarts.com/project/36283/lusion

What makes it 100/100:

- One fixed WebGL2 canvas behind real DOM. Text stays HTML, so it is sharp, crawlable, and selectable. Every frame the renderer reads DOM rectangles and draws matching planes, so type and 3D cannot drift.
- Scroll is taken over. Wheel input eases with `1 - exp(-12 * dt)`, which is frame-rate independent. Drag keeps momentum. Scroll and WebGL read the same value.
- The astronaut sequence is a long reversible camera move: tablet, tunnel, shatter, "Let's work together." The last frame is the ask.
- Post chain is ordered on purpose: SMAA, bloom, a quarter-res cursor-velocity buffer that displaces and splits RGB, then vignette and saturation. Passes turn off per scene.
- They mix offline Redshift footage with a live cursor light and a small camera orbit (~1.7°), remapped onto the plate. Real-time reflection and analytical volumetric light sit on top. The trick is fidelity without simulating everything live.
- Performance is the constraint they name out loud. The tunnel dips to the high 50s because the composer ping-pongs dozens of times. Even they do not get bloom, DOF, and distortion for free.

### 2. Igloo Inc — Awwwards Site of the Year 2024

- https://igloo.inc
- Case study: https://www.awwwards.com/igloo-inc-case-study.html
- Teardown: https://rickcreates.com/r/2024-07-23-igloo-inc

What makes it 100/100:

- The whole company is one downward camera route: snow, then ice, then a glowing social ring. Scroll pushes the camera with momentum. If you stop on a boundary, it eases to the nearer chapter in about two seconds. Nothing rests mid-transition.
- Transitions are a single fullscreen composite of two offscreen section textures: a diagonal ice-crack mask, 5-tap chromatic fringe jittered with blue noise, block displacement, and vertical parallax. The cut is the material of the brand, not a generic wipe.
- Procedural ice crystals grown inside a base volume, so every portfolio object has its own block without a unique sculpt.
- UI is MSDF in WebGL so glitch and letter-scramble are shader offsets, not DOM reflow. That is why the page has almost no text nodes. Beautiful, and hostile to SEO and screen readers. We should steal the camera route, not the decision to hide the copy.
- Loader stages texture upload and shader compile so the first visit is fast. Particles in the footer change shape per link, in time with sound.

### 3. Messenger — Awwwards Developer Site of the Year 2025

- https://messenger.abeto.co
- https://www.awwwards.com/sites/messenger
- https://www.awwwards.com/messenger.html
- Teardown: https://rickcreates.com/r/2025-11-10-messenger

What makes it 100/100:

- A title-screen planet that keeps turning while you decide. Begin, then a white loader, then a two-second camera drop with a fast-in, ease-out, and a whoosh. The descent is the door.
- three.js r180, pmndrs postprocessing, three-mesh-bvh. Models are Draco, textures KTX2. Main bundle ~1.9 MB, ~500 KB gzip. The world is not a giant download.
- Custom LOD that preserves silhouette, so swaps do not pop. BatchedMesh / multi-draw keeps the world around 20–30 draw calls. Safari memory is tracked and assets are dropped the moment a zone ends.
- Sound is diegetic. Each district has a soundscape. A guitarist is mixed in 3D so you find him by ear. Music was written against the picture, not dropped on afterwards.
- Interface motion is stop-motion: two to four jumps to full size, type at ~35 characters a second, a faster close than open. Hover trembles the outline. It feels made, not tweened.

### 4. Bruno Simon — Awwwards Site of the Year 2019, FWA of the Year 2025

- https://bruno-simon.com
- https://www.awwwards.com/brunos-portfolio-case-study.html
- https://legacy.thefwa.com/article/insights-bruno-simon-portfolio
- https://legacy.thefwa.com/news/fwa-of-the-year-2025-peoples-choice-award-winners-announced

What makes it 100/100:

- The portfolio is a place you enter. The 2019 site is a toy car and a folded cardboard world. The later site keeps the drive and adds water, rain, grass that loops to fill the view, and an interface rebuilt as physical objects.
- There are no "common" lights in the original. Shading is illusion: custom shaders, a blur band top and bottom to sell miniature scale, a sun-flare glow. Physics primitives are separate from the visible meshes and allowed to sleep.
- The whole 2019 site is under 3 MB, Draco + gzip, and it runs on a phone. Mobile drops blur, clamps pixel ratio, and turns off matrix auto-updates. Non-players can drag the camera and tap a project without driving.
- The new site instances trees, foliage, benches, pins. Grass, water, terrain, and rain loop with the camera. Textures are ETC1S / UASTC. Hidden faces are deleted. A palette texture replaces per-mesh materials. Mobile disables water blur and DOF and cuts shadow resolution. WebGPU when the browser has it, WebGL when it does not.
- The lesson for us: realism is a budget. Instancing, a quality preset, and a payload that fits in a coffee-shop download beat an unbounded simulation.

### 5. Active Theory v6 — Awwwards Site of the Month, February 2024; FWA of the Month, January 2024

- https://activetheory.net
- https://www.awwwards.com/sites/active-theory-v6
- https://www.richardczhou.com/posts/atv6
- https://www.commarts.com/webpicks/active-theory-2

What makes it 100/100:

- The studio site is the demo reel. Colored tubes grow from the cursor and, on the live site, from other people's cursors. The world notices you, and notices that you are not alone.
- AI chat is navigation, not a widget: "show me a fun project" moves the camera. Scroll velocity feeds a pill-shaped nav.
- Houdini and custom GLSL for the picture; a small functional state layer instead of a pile of scene classes. Polish took most of the schedule. Their dev award is uneven on purpose: animations 9.6, accessibility 6.4. We should match the motion and beat the accessibility number, because this site has to be readable.

### 6. Pioneer — Corn Revolutionized (Resn) — Awwwards Site of the Year 2020

- Campaign: https://go.pioneer.com/cornrevolution (a campaign URL; it may not stay online)
- Making-of: https://www.awwwards.com/resns-pioneer-corn-revolutionized-wins-site-of-the-month-july-2020.html
- Teardown: https://rickcreates.com/r/2020-07-08-pioneer-corn-revolutionized

What makes it 100/100:

- One unbroken 3D shot from DNA to field, played by scroll, reversible, and looped. The story never cuts.
- Scroll adds velocity. The camera then springs to the nearest headline, so you always land on a complete thought. A hard flick can cross several stops. On a phone the picture follows the finger and settles at most one stop past the release.
- They moved type into WebGL after DOM-on-canvas had cost them frames: MSDF, `fwidth` so strokes stay even at any DPR, hit testing by hand. Headline outlines are three draw calls.
- Art direction is one material idea (seed, strand, field) rather than a tour of effects.

### 7. KPR (Resn) — Awwwards Site of the Year 2022

- https://www.kprverse.com
- https://www.awwwards.com/sites/kpr
- https://www.awwwards.com/kpr-by-resn-wins-sotm.html

What makes it 100/100:

- A book of concept-art tableaux. Scroll reveals the Keep, the factions, the world. Hold a picture and a second layer of lore opens behind it.
- Stencil-buffer masking: one scene is the window for another, and pixels outside the mask are discarded so hidden scenes are not shaded. Card-flips use the same trick.
- Hold-frames are laid out with CSS transforms, not a second WebGL UI. The split is pragmatic: WebGL where the mask matters, DOM where type and layout matter.

### 8. Orano (Immersive Garden) — Awwwards Site of the Year 2018

- https://immersive-g.com/projects/orano/
- https://www.awwwards.com/orano-from-immersive-garden-wins-site-of-the-month-novemeber.html

What makes it 100/100:

- A vertical scroll per product that ends in a small piece of play (long-press, a drone you fly). The game is the explanation.
- Stylised wireframes instead of fake photoreal product shots. They knew hyperrealism of the equipment would be heavier and less clear.
- Intro and menu are grade changes: tile offset, RGB offset driven by the cursor, saturation, SMAA when DPR is under 2. The chrome reacts; the models stay light.
- Sound is credited as its own discipline, not a loop someone added on Friday.

### 9. Prometheus Fuels (Active Theory) — Awwwards Site of the Year 2021

- https://www.prometheusfuels.com
- https://www.awwwards.com/prometheus-by-active-theory-wins-site-of-the-month-may-2021.html
- https://medium.com/active-theory/prometheus-2d3c05b88ec0

What makes it 100/100:

- A scroll story with a camera authored as a start and end per chapter, tuned in the browser, not re-exported from a spline every time a director nudged it.
- Only one chapter is rendered at a time. During a transition they ping-pong, so two pictures are visible and one scene is drawn per frame.
- Collage: photos and drawings projected on meshes. Some secondary motion is deliberately 12 fps while the camera stays at 60, which reads as drawn, not as a dropped frame. Easy to overdo.
- Gradient edges get screen-space noise and then a step, so the grain lives on the boundary and not as a dirty film over the type.

### 10. The Sea We Breathe (Green Chameleon / Blue Marine Foundation) — Webby People's Voice, 2022

- https://www.theseawebreathe.com
- https://www.bluemarinefoundation.com/the-sea-we-breathe/
- https://www.commarts.com/webpicks/the-sea-we-breathe
- https://www.awwwards.com/inspiration/the-sea-we-breathe-dive-into-3-immersive-underwater-journeys

What makes it 100/100. This is the closest sibling to our dive:

- Three real underwater journeys, scroll as swimming, a HUD borrowed from navigation instruments, and a breathing exercise before the drop so the visitor arrives slowly.
- They say outright that dynamic lighting is too expensive for the web. "Fake" god rays sell direction and forward motion. Caustics and shadows are painted to agree with that same sun. Every texture is graded to the same light. Species are a mix of baked animation and a few interactive joints.
- Narration (Stephen Fry) and a dense sound bed. Multisensory, not a silent demo.
- HTML carries the UI. three.js carries the water. The split is the same one Lusion uses, and the one we should use.

### 11. Lando Norris — Awwwards Site of the Year 2025

- https://landonorris.com
- https://www.awwwards.com/annual-awards/winners
- Notes: https://rickcreates.com/year

What makes it 100/100:

- A single object (the helmet) threads racing and life off-track. The cursor stirs patches on the opening portrait. The footer returns to the helmet. Repetition is the identity.
- WebGL and GSAP, but the site is still a driver's site: fast, photographic, typographically sure. 3D is not an excuse for vague copy.
- Users' Choice and jury Site of the Year in the same year. People who do not make websites also wanted to stay.

### 12. three.js ocean examples

- FFT ocean: https://threejs.org/examples/webgl_shaders_ocean.html
- Reflective water mesh: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js
- Discussion of why the stock mirror is flat, and what FFT adds: https://discourse.threejs.org/t/animated-ocean-waves/43814

What is worth taking:

- `webgl_shaders_ocean` is Tessendorf's spectrum: GPU FFT, choppy displacement, normals derived from the same field. It is the reference for "this is a sea, not a sine." It is also a full-screen simulation with a large vertex grid. Stacked under fish, a city, and bloom, it will miss 60 fps on a laptop.
- `Water.js` scrolls two normal maps, renders a mirror target, and paints a sun specular. The mesh itself does not displace. Forums have pointed out that objects sit on a flat line. The glint and the reflection are still the right idea.
- Our resolution of that pair: a summed Gerstner field so the surface actually moves, analytical normals so the specular stays smooth on a modest grid, and a shared sky function so the reflection matches the dome. FFT and a 190k-vertex polar ocean are the thing we are deliberately not shipping.

### 13. WaterThreeJS and deep-ocean-sim — modern ocean shading notes

- https://github.com/achrefelouafi/WaterThreeJS
- https://github.com/psticea/deep-ocean-sim
- https://github.com/Humpalumps/Ultra-Water
- https://github.com/squall01337/abyssal-ocean

What the current best shader oceans agree on:

- One wave field drives everything: surface, caustics, and the surge in the plants. If the kelp sways on a different clock than the swell, the shot falls apart.
- Beer–Lambert absorption. Red dies first. Shallow water is turquoise, the deep is not "navy overlay," it is missing red.
- Caustics from the wave field itself (inverse Jacobian of the refracted sun) are the physically right answer. They are also the expensive one. A sharp animated caustic projected in world XZ, gated by the upward normal and by remaining sunlight, reads the same in a still if the pattern is crisp and it moves with the swell.
- God rays are that caustic field seen from the side: a short ray march along the sun, Henyey–Greenstein phase, reconstructed from the depth buffer. WaterThreeJS uses about 28 steps. We use fewer steps and sheets of light in the volume, because the march is the first thing that kills a reef full of instances.
- Snell's window. From below, inside the ~48.6° cone (IOR 1.333), the sky is refracted and bright. Outside it, total internal reflection, and the water must stay luminous teal, never black.
- A camera-following grid, snapped to the vertex spacing, so the surface does not swim relative to the waves.
- Tone map once, at the end, from an HDR buffer. Bloom has to see values above 1. If the renderer tone-maps into the beauty pass first, the sun cannot bloom.

### 14. Anderson Mancini — 3D Realistic Water, Awwwards Honorable Mention, June 2025

- https://andersonmancini.dev/projects/realistic-water
- https://www.awwwards.com/sites/3d-realistic-water-experiment

What makes it 100/100 for water specifically:

- A pool you can believe: vertex displacement, projected caustics on the tiles, absorption, a waterline, droplets. The material responds when you change roughness and color, which is how you know the shading model is real and not a baked video.
- It is a single tank, carefully lit. Scope is why it holds up. We have a whole water column, so we take the waterline, the caustic projection, and the refusal to let the surface go plastic, and we do not try to simulate spray on top of a city.

### 15. Codrops water distortion and the Crosswire case study

- https://tympanus.net/codrops/2019/10/08/creating-a-water-like-distortion-effect-with-three-js/
- https://tympanus.net/codrops/2022/04/11/creating-a-fluid-distortion-animation-with-three-js/
- https://tympanus.net/codrops/2023/04/04/case-study-crosswire/

What makes them 100/100 as craft notes:

- The 2019 tutorial encodes ripple direction in the red and green channels of a canvas and intensity in blue, then a post pass displaces the frame. No fluid sim. The cursor still feels wet. Lusion's cursor buffer is the same family, at higher resolution and with chromatic split.
- Crosswire (Active Theory's orbit) instances from a Blender point cloud, fades between several matcaps along the camera path instead of paying for realtime reflections, and builds motion trails as a sampled ribbon. Matcaps and instances are how a metallic scene stays at 60.

### 16. Spline — product-site 3D, scroll and cursor as first-class events

- https://spline.design
- https://spline.design/web
- https://viewer.spline.design/

What makes it 100/100 for interaction, not for our rendering:

- Scroll is a camera state, not a scrubber the visitor has to understand. Follow and look-at bind objects to the cursor. Orbit and zoom are opt-in.
- The scene hears the page. A WebGL canvas that swallows the wheel is a broken website. Spline's viewer is the reminder: the page scrolls, the scene reacts.
- WebGPU with a WebGL fallback. We stay on WebGL2 so the dive runs in current laptop browsers without a second renderer, and we clamp DPR instead.

### 17. Active Theory v4 and Resn's own studio history

- Active Theory v4, Awwwards Site of the Year 2018: https://activetheory.net
- Resn: https://www.resn.co.nz
- Canon of the award, for the pattern across years: https://exhibita.design/canon.html

Worth keeping: twenty-five of thirty-one listed Sites of the Year render in 3D. Four of them are studios' own sites. The work that wins is the work that proves the studio can do the thing the visitor is about to buy. That is the brief. Someone should finish the dive and want AR Dynamics to build theirs.

## What we are copying, and what we are refusing

Copying:

- One continuous downward camera, chapters as stops, exponential easing so the wheel feels like Lusion and the picture still lands on a sentence like Pioneer.
- HTML type over a fixed canvas. Igloo's MSDF UI is the wrong trade for a studio that needs to be found and read.
- Gerstner water, a sky function shared with the reflection, Beer–Lambert fog, Snell's window, world-space caustics, sun glitter, foam on the crests.
- A real refraction of the underwater scene when the camera is above the surface, so the reef is visible through the water instead of a blue pane.
- Life that does not wait for scroll: flocking, sway, a whale on its own clock, a craft that is already down there before you follow it.
- The cursor moves the camera a little, and the fish get off the ray. No RGB split on the type.
- Bloom, a light vignette, film grain, and a very small depth of field on large screens only.
- Instancing, a mobile preset, DPR capped by viewport area, shader compile during a loader that has real progress.
- Sound off until someone asks. Then a depth-mixed bed: surface hiss up top, a low drone in the dark, a thin tone near the craft. Synthesized in the Web Audio API so we ship no licensed stems.
- A still, typeset page when WebGL is missing or the visitor asked for reduced motion, with a way to enter the dive anyway.

Refusing, on purpose:

- A full FFT ocean, Jacobian caustics, and a 28-step volumetric march. They are the right physics and the wrong frame time once the reef exists. The phenomena have to read; the simulation does not have to be complete. WaterThreeJS is the look; Bruno's phone preset is the budget.
- Multiplayer cursors, AI chat, Draco hero models. There is no second user in this brief, and procedural geometry keeps the license surface clean and the payload small.
- WebGL text. Accessibility on Active Theory v6 was the weak score. Ours should not be.
- Invented clients, metrics, or testimonials.
- Autoplaying audio.
- A fake contact form that posts nowhere.

## Scorecard

The site is not done until a modern laptop can sit on each row and the answer is yes. Mobile must still look like the same place, with the low preset, not a different and poorer idea.

| # | Bar | Pass looks like |
| --- | --- | --- |
| 1 | Visual realism | Golden-hour surface with a glitter path and a sky the reflection agrees with. Underwater: color loses red with depth, caustics on the sand, shafts in the reef, a bright Snell window if you look up. Nothing reads as a flat normal-mapped plane. |
| 2 | One shot | Scroll from the headline to the ask without a cut, a load, or a slide. The craft is glimpsed, then followed, then the city is the last frame. |
| 3 | Alive at rest | Leave the mouse still on the hero. Water, birds, and light keep moving. Fish school without input. |
| 4 | Reacts | Moving the pointer parallaxes the camera. A school near the cursor opens. The depth meter agrees with the camera. |
| 5 | Life in the water | Schools, kelp, coral, a manta or a whale, jellies with their own light, plankton, bubbles. Not one hero fish. |
| 6 | The ask | Atlantis is the "build with us" chapter, not a logo on black. The mail link is real. |
| 7 | Type | Instrument Serif, Newsreader, Fragment Mono. Editorial, not a component library. Cards are glass and they do not cover the horizon. |
| 8 | Motion craft | Camera eases. Chapters stick while the world moves. No spinner-as-personality. Loader, then the picture. |
| 9 | Sound | Silent by default. Toggle is a real button. The mix changes with depth. Reduced motion still gets the still page. |
| 10 | Performance | 60 fps target at the hero and the reef on a laptop. DPR clamp, instances, refraction and DOF dropped on small screens, grain and bloom kept. |
| 11 | Access and SEO | One h1, landmarks, skip link, contrast on the glass, visible focus, canvas hidden from assistive tech, meta and Open Graph, noscript with the email and the address. |
| 12 | Truth | Services and products match what AR Dynamics actually makes. No fake proof. Address and hello@ardynamicsinc.com in the footer. |
| 13 | Fallback | No WebGL, or reduced motion: a designed still page with the same words, not an error string. |
| 14 | Payload and license | Procedural geometry. OFL fonts with the license shipped. No asset whose license will not cover a public commercial site. |
| 15 | The feeling | A stranger should be able to say, without help, that this studio builds worlds, and should have a mail link under their thumb when they decide they want one. |

## How the ThreeUI Community code is used

The Community repo is MIT for its own shaders. The water, flocking, and city in this site are new, because the catalog does not contain an ocean dive. Three techniques are adapted and credited in `CREDITS.md`:

- Fresnel rim from `src/shaders/liquid-form/liquidFormShaders.ts` and the glass bead shader in `src/shaders/animated-top-dock/glassParticleField.ts`. Water uses Schlick with an air-water F0 of 0.02. Domes and the craft use the steeper glass exponent from the bead shader.
- Per-channel refraction offsets from that same glass shader, scaled down, on the water's refraction sample.
- Glow falloff shaped with a power curve, the way `src/shaders/emerald-horizon/emeraldHorizonShaders.ts` shapes its horizon. Used on jellies, runes, and the spire so bloom has a falloff instead of a flat add.

Bundled fonts are the Community OFL set: Instrument Serif, Newsreader, Fragment Mono. Lexend and Onest are licensed in the parent repo and are not shipped here.
