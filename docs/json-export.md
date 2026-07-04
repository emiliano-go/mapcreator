---
seo:
  title: JSON Export - MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/json-export
  robots: index,follow
  og:
    type: website
    title: JSON Export - MapCreator Documentation
    description: How mapcreator exports JSON, how to use the file, and where to change the format.
    url: https://emiliano-go.github.io/mapcreator/json-export
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: JSON Export - MapCreator Documentation
    description: How mapcreator exports JSON, how to use the file, and where to change the format.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: How mapcreator exports JSON, how to use the file, and where to change the format.
---

# JSON Export

MapCreator exports a JSON snapshot of the current editor state.
Use it to save a map, move it between machines, or inspect the generated data structure.

## How to export

- Click `Export` in the menu bar
- Use the `save` keybind
- The file downloads as `<map name>.json`
- The editor also posts the same payload to `POST /api/export` when the canvas save flow runs

## What the export contains

The current export is the full editor bundle returned by `exportFull()` in `src/editor/store.ts`.

```ts
{
  map: BuildingMap,
  simulation: {
    roomA,
    roomB,
    options,
    path,
    paused,
    pendingFloor,
  },
  tileClasses,
  overlayClasses,
  regions,
}
```

The actual map data lives in `map`.
That `map` object matches the `BuildingMap` schema in `src/core/validator.ts`.

## How to use it

- To load a map back into the editor, import a plain `BuildingMap` JSON file
- To inspect or reuse the file in another tool, read the `map` field first
- To serve a saved export in viewer mode, point `?map=` to the JSON file path used by the app

Example viewer URL:

```text
/?view&map=maps/main.json
```

## How to change it

If you want a different export format, change these files:

- `src/editor/store.ts`
- `src/editor/MenuBar.tsx`
- `src/editor/canvas/interaction.ts`

The key decision is whether the export should be:

- a full editor snapshot from `exportFull()`
- a map-only file from `exportMap()`

If you want a clean, importable map JSON, switch the export call to `exportMap()` and keep the validator in sync with `BuildingMapSchema`.

## JSON schema notes

- `floors[*].base` uses tile types like `wall`, `floor`, `stairs`, `elevator`, `outside`, `void`, and `dirt_path`
- `floors[*].overlay` uses `door`, `exit_door`, `room`, or `null`
- `floors[*].meta` stores tile metadata keyed by `row,col`
- `version`, `createdAt`, and `updatedAt` are part of the persisted map
- `buildings` is optional on import, but the app fills in a default building when it is missing

## Next step

Read the [Configuration](configuration.md) guide for the map fields that control the exported data.
