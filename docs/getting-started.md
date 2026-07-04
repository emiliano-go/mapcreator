---
seo:
  title: Getting Started - MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/getting-started
  robots: index,follow
  og:
    type: website
    title: Getting Started - MapCreator Documentation
    description: Prerequisites, install, first map, export, and build.
    url: https://emiliano-go.github.io/mapcreator/getting-started
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:width: 1200
    image:height: 630
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: Getting Started - MapCreator Documentation
    description: Prerequisites, install, first map, export, and build.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: Prerequisites, install, first map, export, and build.
---

# Getting Started

## Prerequisites

- Node.js 22 or later
- pnpm (install with `npm install -g pnpm`)

## Install

```bash
git clone <your-fork>
cd mapcreator
pnpm install
```

## Start the dev server

```bash
pnpm dev
```

Open http://localhost:5173. The editor loads with a default empty map.

## Paint your first map

1. Select a tile tool from the left toolbar (Wall, Floor, Room, etc.)
2. Click on the canvas to place tiles
3. Right-click to erase
4. Use the overlay tab to place doors and room labels on top of base tiles
5. Switch between tabs to manage floors (add, rename, reorder)

## Export

Click the Export button in the menu bar.
The map is saved as a JSON file.
Place it in the `maps/` directory.

## Customize theme colors

Edit `src/theme/tileStyles.ts` to change fill and stroke colors for each tile type. The file exports `tileStylesLight` and `tileStylesDark` palettes. Edit `src/theme/vars.css` to change the UI shell colors.

## Build for production

```bash
pnpm build
```

Output goes to `dist/`.

## Run tests

```bash
pnpm test
```

## Next steps

Read [Core Concepts](core-concepts.md) for the data model.
Read the [Editor Guide](editor-guide.md) for all painting features.
