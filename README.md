<p align="center">
  <img src="docs/assets/images/mapcreator-banner.png" alt="MapCreator banner" width="100%">
</p>

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
  <a href="https://github.com/emiliano-go/mapcreator/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/emiliano-go/mapcreator/ci.yml?branch=master&style=for-the-badge&logo=github&label=CI" alt="CI">
  </a>
  <a href="https://codecov.io/gh/emiliano-go/mapcreator">
    <img src="https://img.shields.io/codecov/c/github/emiliano-go/mapcreator?style=for-the-badge&logo=codecov&label=Coverage" alt="Coverage">
  </a>
</p>

---

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser. Select a tile tool, click on the canvas to place a wall or floor, and paint your first map. Right-click to erase. Export your map as JSON from the menu bar.

[Full getting started guide &rarr;](docs/getting-started.md)

---

## Why mapcreator?

Most indoor navigation solutions require external map services, API keys, and complex GIS data. MapCreator is different: it works entirely in the browser with zero external dependencies. No API calls, no map tiles, no vendor lock-in. Your floor plans are plain JSON files you own and control.

---

## Key features

| Category | What mapcreator handles |
|---|---|
| **Tile painting** | 7 base tile types (wall, floor, stairs, elevator, outside, dirt_path, void) + 3 overlay types (door, exit_door, room) |
| **Multi-floor maps** | Add, remove, reorder, duplicate floors. Stairs connect via toFloorSuperior/toFloorInferior. Elevators connect through connectedFloors lists. |
| **A* pathfinding** | Manhattan heuristic, configurable weights, diagonal mode, accessibility filtering, floor changes, elevator preference |
| **Room detection** | BFS flood-fill room region detection with anchor points and door counts. Destinations derived from rooms, exits, doors, stairs, and elevators. |
| **Canvas controls** | Scroll to zoom, middle-click to pan, Shift-click for straight line mode. Three detail thresholds (stroke, grid, detail) based on zoom level. |
| **Light and dark themes** | Two complete color palettes for editor and viewer, switchable with one click |
| **Validation and migration** | Zod schemas validate map data on import/export. Built-in version migration system (current version 3.0.0). |
| **Keyboard shortcuts** | 37 customizable shortcuts across 7 categories, saved to localStorage |
| **Deployment options** | Docker, docker-compose, nginx, Node.js server, or static file serving |

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

## Build & test

```bash
pnpm build             # production build to dist/
pnpm test              # run tests
pnpm lint              # lint source code
pnpm typecheck         # TypeScript type checking
```

---

### Coverage

Expected test coverage is measured by Codecov. Coverage reports are generated automatically by CI (`vitest run --coverage`) and uploaded to [Codecov](https://codecov.io/gh/emiliano-go/mapcreator). The `codecov.yml` config enforces a project-level target of 70% with a 5% tolerance on PRs.

---

## Documentation

- [Getting Started](docs/getting-started.md) - setup and first map
- [Core Concepts](docs/core-concepts.md) - architecture and data model
- [Editor Guide](docs/editor-guide.md) - painting tiles, layers, and tools
- [Viewer Guide](docs/viewer-guide.md) - A to B navigation and pathfinding
- [Tile Types](docs/tile-types.md) - base tiles and overlays reference
- [Configuration](docs/configuration.md) - map config and theme reference
- [JSON Export](docs/json-export.md) - export format, usage, and customization
- [Pathfinding](docs/pathfinding.md) - A* algorithm, weights, and floor changes
- [Deployment](docs/deployment.md) - Docker, nginx, and GitHub Pages

---

## License

MIT
