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

## Integration guide

The exported `BuildingMap` JSON is self-contained and designed to be consumed by external applications — building directories, accessibility tools, robotics planners, or any app that needs a tile-based floor plan with pathfinding.

### 1. Load and validate the JSON

Use the [Zod](https://zod.dev) schema from `src/core/validator.ts` to validate incoming data in a TypeScript/JavaScript app:

```ts
import { BuildingMapSchema } from './core/validator'
import type { BuildingMap } from './core/types'

const raw = await fetch('/maps/main.json').then((r) => r.json())
const result = BuildingMapSchema.safeParse(raw)

if (result.success) {
  const map: BuildingMap = result.data
  console.log(`Loaded map "${map.name}" with ${map.floors.length} floors`)
} else {
  console.error('Invalid map file', result.error.issues)
}
```

In other languages you can validate against the structure defined below.

### 2. Understand the `BuildingMap` schema

```ts
interface BuildingMap {
  id: string            // unique map identifier
  name: string          // display name shown in the viewer header
  version: string       // schema version for forward-compatibility
  createdAt: string     // ISO 8601 timestamp
  updatedAt: string     // ISO 8601 timestamp
  floors: MapFloor[]    // the floor tiles
  defaultFloor: number  // floorIndex of the initially visible floor
  buildings?: BuildingInfo[]  // optional building metadata
}
```

Each `MapFloor` contains the actual tile grid:

```ts
interface MapFloor {
  floorIndex: number
  buildingId: string    // ties this floor to a BuildingInfo record
  label: string         // e.g. "Ground Floor", "Floor 2"
  order: number         // visual stacking order
  width: number         // column count
  height: number        // row count
  base: TileType[][]    // grid[row][col] — traversable surface
  overlay: OverlayType[][] // grid[row][col] — doors, room markers
  meta: Record<string, TileMeta> // keyed by "row,col"
}
```

**Tile types (`base`):**

| Value       | Traversable | Notes                              |
| ----------- | ----------- | ---------------------------------- |
| `floor`     | yes         | standard walkable tile             |
| `stairs`    | yes         | vertical connection via meta       |
| `elevator`  | yes         | vertical connection via meta       |
| `dirt_path` | yes         | outdoor path (avoided by `noOutside`) |
| `outside`   | yes         | outdoor area, higher cost          |
| `wall`      | only with door overlay | blocked unless a door is placed |
| `void`      | no          | empty cell, not part of the map    |

**Overlay types (`overlay`):**

| Value       | Meaning                    |
| ----------- | -------------------------- |
| `door`      | passable opening in a wall |
| `exit_door` | passable exit/entrance     |
| `room`      | room label marker          |
| `null`      | no overlay                 |

**Tile metadata (`meta["row,col"]`):**

| Field              | Type       | Applies to             | Description                              |
| ------------------ | ---------- | ---------------------- | ---------------------------------------- |
| `label`            | `string`   | any tile               | display label (e.g. room name)           |
| `accessible`       | `boolean`  | any tile               | `false` marks the tile as blocked        |
| `weight`           | `number`   | doors                  | pathfinding surcharge (default 0.5)      |
| `toFloorSuperior`  | `number`   | stairs                 | floorIndex this stair goes up to         |
| `toFloorInferior`  | `number`   | stairs                 | floorIndex this stair goes down to       |
| `connectedFloors`  | `number[]` | elevator               | all floorIndex values this elevator serves |
| `tags`             | `string[]` | any tile               | custom classification tags               |

### 3. Build a navigation graph

Use the `buildGraph()` function from `src/core/GraphBuilder.ts` to turn a `BuildingMap` into an adjacency graph usable for pathfinding:

```ts
import { buildGraph } from './core/GraphBuilder'

const graphData = buildGraph(map, { noOutside: true })
// Returns:
// {
//   adjacency: Map<string, GraphEdge[]>,
//   nodeMeta: Map<string, TileMeta>,
//   nodeTypes: Map<string, { base: TileType, overlay: OverlayType }>
// }
```

Node IDs follow the pattern `{floor}:{row}:{col}` — e.g. `"0:5:12"` is floor 0, row 5, column 12. Each edge carries a `weight` and a `crossFloor` boolean. Stairs and elevators produce cross-floor edges with a surcharge (stairs = 12, elevator = 11) so interior routes on the same floor are preferred.

### 4. Run A* pathfinding

The `findPath()` function in `src/core/Pathfinder.ts` runs A* with Manhattan heuristic on the graph:

```ts
import { findPath } from './core/Pathfinder'

const result = findPath(
  graphData,
  '0:3:7',           // from node (floor 0, row 3, col 7)
  '1:12:4',          // to node (floor 1, row 12, col 4)
  { accessibleOnly: true, noOutside: true },
)

if (result.found) {
  console.log(`Path found! ${result.path.length} tiles, ${result.floorChanges} floor changes`)
  for (const node of result.path) {
    console.log(`  ${node.floorIndex}:(${node.row},${node.col}) — ${node.base}${node.overlay ? '/' + node.overlay : ''}`)
  }
}
```

Options:

| Option             | Type      | Default | Description                                      |
| ------------------ | --------- | ------- | ------------------------------------------------ |
| `accessibleOnly`   | `boolean` | `false` | skip tiles where `meta.accessible === false`     |
| `preferElevator`   | `boolean` | `false` | try stairs-free route first, fall back to stairs |
| `maxFloorChanges`  | `number`  | unlimited | cap the number of floor transitions          |
| `noOutside`        | `boolean` | `false` | exclude `outside` and `dirt_path` tiles          |

### 5. Integration examples

#### TypeScript / JavaScript bundler

If your app uses the same Vite/Rollup/Webpack setup, import the core modules directly:

```ts
import { validate } from 'mapcreator/src/core/validator'
import { buildGraph } from 'mapcreator/src/core/GraphBuilder'
import { findPath } from 'mapcreator/src/core/Pathfinder'
```

#### Plain JavaScript (browser)

Fetch a map JSON and process it manually. The node ID convention `{floor}:{row}:{col}` lets any consumer locate tiles:

```js
const res = await fetch('/maps/main.json')
const data = await res.json()
const map = data.map ?? data   // support both full export and map-only JSON

// Iterate floor tiles
for (const floor of map.floors) {
  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const tile = floor.base[row][col]
      const overlay = floor.overlay[row][col]
      const meta = floor.meta[`${row},${col}`] ?? {}
      console.log(`floor ${floor.floorIndex} (${row},${col}): ${tile} / ${overlay}`, meta)
    }
  }
}
```

#### Python

```python
import json, requests

resp = requests.get("https://example.com/maps/main.json")
data = resp.json()
bmap = data.get("map", data)  # unwrap full export if present

for floor in bmap["floors"]:
    print(f"Floor {floor['floorIndex']}: {floor['label']} ({floor['width']}x{floor['height']})")
    for row_idx, row in enumerate(floor["base"]):
        for col_idx, tile in enumerate(row):
            overlay = floor["overlay"][row_idx][col_idx]
            if overlay == "exit_door":
                print(f"  Exit at ({row_idx}, {col_idx})")
```

#### CLI tool

Pipe a map through any script that reads the JSON from stdin:

```bash
curl -s https://example.com/maps/main.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
bmap = data.get('map', data)
print(f'{bmap[\"name\"]} — {len(bmap[\"floors\"])} floors')
for f in bmap['floors']:
    tiles = sum(1 for row in f['base'] for t in row if t != 'void')
    print(f'  {f[\"label\"]}: {tiles} walkable tiles')
"
```

### 6. Serve a map to the viewer

The built-in viewer mode reads the map from the editor store, but you can also embed a pre-exported JSON by loading it into the store before mounting the viewer component:

```ts
import { useStore } from './editor/store'
import ViewerShell from './viewer/ViewerShell'

const map = await loadMapFromUrl('/maps/main.json')
useStore.getState().setMap(map)

// Then render:
<ViewerShell map={map} />
```

For the standalone viewer (no editor, pathfinding only), pass `?view` in the URL. The app loads the map from the store — point your deployment to serve the desired JSON at the path expected by the app.

### 7. API endpoint (Docker deployment)

When running the [Docker deployment](../deployment.md), the Node.js server exposes:

- **`POST /api/export`** — accepts `{ filename, data }`, writes `data` (the full editor bundle) to the exports volume
- **`GET /api/export`** — lists exported JSON files

Example upload from another app:

```bash
curl -X POST https://mapcreator.example.com/api/export \
  -H 'Content-Type: application/json' \
  -d '{
    "filename": "floorplan.json",
    "data": { "map": { ... } }
  }'
```

## Next step

Read the [Configuration](configuration.md) guide for the map fields that control the exported data.
