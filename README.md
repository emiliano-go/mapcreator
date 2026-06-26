<p align="center">
  <h1 align="center">mapcreator</h1>
</p>

<p align="center">
  <strong>Tile-based building map editor with A* pathfinding. Draw floors, connect rooms, navigate A to B.</strong>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white&style=for-the-badge" alt="TypeScript">
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge" alt="React">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-10AC84?style=for-the-badge" alt="License">
  </a>
</p>

---

## What is mapcreator?

mapcreator is a GitHub template repository for building interactive floor plan maps. It provides a visual canvas editor for painting tile-based building layouts and a read-only viewer for A to B pathfinding navigation. Same map data, two interfaces.

**Paint. Connect. Navigate. Zero external map dependencies.**

---

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser. Start painting.

### Customize colors

Edit `src/theme/tileStyles.ts` to change the color of each tile type. The file defines separate light and dark palettes for wall, floor, room, door, stairs, elevator, outside, dirt_path, and void tiles. Overlay styles for doors, exit doors, and rooms are also configurable.

---

## What mapcreator handles

**Tile painting**: Left-click to place tiles, right-click to erase. Tools include wall, floor, room, stairs, elevator, outside, dirt_path, void, door, exit_door, and room overlay. Eyedropper and flood fill for rapid editing.

**Multi-floor maps**: Add, remove, reorder, duplicate, and rename floors. Each floor has its own grid and tile data. Stairs connect via toFloorSuperior and toFloorInferior metadata. Elevators connect through connectedFloors lists.

**A* pathfinding**: The pathfinder uses a Manhattan heuristic with configurable weights. Supports diagonal movement, accessibility filtering, floor changes, and outside avoidance. Options include preferElevator, maxFloorChanges, and accessibleOnly.

**Room detection**: Automatic flood-fill room region detection. Each room gets an anchor point, door count, and label. Navigation destinations are derived from room regions, exits, doors, stairs, and elevators.

**Canvas controls**: Scroll to zoom, middle-click to pan, Shift-click for straight line mode. Grid rendering uses three detail thresholds (stroke, grid, detail) based on zoom level.

**Light and dark themes**: Two complete color palettes for editor and viewer. Switch between them with a single click.

**Validation and migration**: Zod schemas validate map data on import and export. Built-in version migration system handles schema changes across versions (current version 3.0.0).

**Keyboard shortcuts**: 37 customizable shortcuts across 7 categories. Saved to localStorage. Import, export, and reset via the keybinds panel.

**Multiple deployment options**: Docker, docker-compose, nginx, Node.js server, or static file serving.

---

## Algorithms

### A* pathfinding

The pathfinder implements the A* search algorithm with a Manhattan distance heuristic.

```ts
heuristic(a, b) = |a.row - b.row| + |a.col - b.col|
```

A binary min-heap priority queue manages the open set. Nodes are evaluated by f-score (g + h), where g is the accumulated cost from the start and h is the heuristic estimate to the goal. The algorithm guarantees the shortest path when all edge weights are non-negative.

**Weight system**: Each traversable tile has a base weight of 1. Doors add a surcharge of 3. Cross-floor edges (stairs and elevators) add a cost of 10 to discourage unnecessary floor changes. Custom weights can be set per tile in the property panel.

**Options**:
- `accessibleOnly`: skips tiles with `accessible: false`
- `preferElevator`: runs A* twice, first with stairs edges removed, falling back to standard A* if no elevator route exists
- `maxFloorChanges`: limits the number of floor transitions
- `noOutside`: excludes outside tiles from the graph
- `allowDiagonal`: enables eight-directional movement (set in map config)

### Graph construction

The `GraphBuilder` converts a `BuildingMap` into an adjacency graph before pathfinding.

1. For each floor, every traversable tile becomes a graph node
2. Edges connect to adjacent traversable tiles in four cardinal directions
3. Wall tiles with door or exit_door overlays become traversable with the door weight surcharge
4. Stairs tiles gain edges to their connected floor's stairs tiles via `toFloorSuperior` and `toFloorInferior` metadata
5. Elevator tiles gain edges to all tiles on their connected floors via the `connectedFloors` list
6. Contiguous stairs and elevator tiles are grouped into clusters; cross-floor edges connect from any tile in one cluster to any tile in the other

### Room region detection

Room regions are found using BFS flood-fill on tiles with a `room` overlay. Contiguous room tiles form a region. Each region has an anchor point (top-left tile) and a door count calculated by scanning adjacent tiles for door and exit_door overlays. Unlabeled regions are classified as hallways. Named regions become navigation destinations.

### Tile grouping

Stairs and elevator tiles that share the same base type and are orthogonally adjacent form tile groups. These groups are used both for cross-floor edge generation and for rendering ghost indicators on other floors. The grouping uses BFS with visited tracking and runs per floor.

### Floor connectivity validation

Each floor is checked for at least one exit door or a stairs/elevator with active connections to another floor. Floors that fail this check are flagged with a validation error badge in the editor.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Canvas | HTML5 Canvas API (zero libraries) |
| Pathfinding | A* with Manhattan heuristic (custom) |
| State | Zustand 5 |
| Validation | Zod 4 |
| Testing | Vitest + @testing-library/react |
| CI | GitHub Actions |

---

## Project structure

```
├── src/
│   ├── core/       Types, graph builder, pathfinder, validator, room detection
│   ├── editor/     Canvas painter, toolbar, property panel, floor manager, keybinds
│   ├── viewer/     Read-only A to B navigation canvas and panel
│   └── theme/      Tile style palettes and CSS variables
├── maps/           Exported .json map files
├── tests/          Unit tests for core logic
├── server.js       Production Node.js server
├── Dockerfile      Multi-stage Docker build
└── nginx.conf      Alternative nginx deployment
```

---

## Documentation

- [Getting Started](docs/getting-started.md): setup and first map
- [Core Concepts](docs/core-concepts.md): architecture and data model
- [Editor Guide](docs/editor-guide.md): painting tiles, layers, and tools
- [Viewer Guide](docs/viewer-guide.md): A to B navigation and pathfinding
- [Tile Types](docs/tile-types.md): base tiles and overlays reference
- [Configuration](docs/configuration.md): map config and theme reference
- [Pathfinding](docs/pathfinding.md): A* algorithm, weights, and floor changes
- [Deployment](docs/deployment.md): Docker, nginx, and GitHub Pages

---

## License

MIT
