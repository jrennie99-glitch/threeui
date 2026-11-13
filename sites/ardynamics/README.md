# AR Dynamics

Marketing site for AR Dynamics Inc. One scroll-driven dive, from a golden-hour surface to a bioluminescent city. The picture is React Three Fiber. The words are HTML.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

`npm run build` writes a static site to `dist/`.

Deep links for the camera, useful while tuning:

- `?at=surface`
- `?at=reef`
- `?at=whale`
- `?at=ufo`
- `?at=atlantis`
- `?still=1` forces the reduced-motion page
- `?dive=1` enters the dive even when reduced motion is on

## Deploy on Vercel

- Root directory: `sites/ardynamics`
- Build command: `npm run build`
- Output directory: `dist`
- Node 20 or newer

`vercel.json` in this folder sets those and caches hashed assets. The Open Graph image is `public/og.png`, referenced as `https://ardynamicsinc.com/og.png`. Change the canonical URL in `index.html` if the production host is different.

## Licenses

See `CREDITS.md` and `public/FONT-OFL.txt`. Geometry is original. Fonts are SIL OFL 1.1.
