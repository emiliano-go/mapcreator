---
seo:
  title: MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/
  robots: index,follow
  og:
    type: website
    title: MapCreator Documentation
    description: A tile-based building map editor with A* pathfinding. Draw floors, connect rooms, navigate A to B.
    url: https://emiliano-go.github.io/mapcreator/
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:width: 1200
    image:height: 630
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: MapCreator Documentation
    description: A tile-based building map editor with A* pathfinding. Draw floors, connect rooms, navigate A to B.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: A tile-based building map editor with A* pathfinding. Draw floors, connect rooms, navigate A to B.
---

<div style="text-align: center">
  <img src="src/assets/hero.png" alt="MapCreator" width="80%"/>
</div>
<p align="center">
  <strong style="font-size: 2.5em;">MapCreator</strong>
</p>
<p align="center">
  <em>Tile-based building map editor with A* pathfinding.</em>
</p>

MapCreator is a tile-based building map editor and viewer.
It lets you paint floor plans on a canvas, define rooms and connections, and navigate between points using A* pathfinding.

The project is a GitHub template repository.
Fork it, configure your building, paint your map, and deploy.

## What you can do

- Paint tile-based floor plans with a visual canvas editor
- Define multi-floor buildings with stairs and elevators
- Add doors, exits, and room labels as overlays
- Run A* pathfinding between any two navigable points
- Export maps as JSON and validate them with Zod schemas
- Switch between editor mode and read-only viewer mode
- Deploy via Docker, nginx, Node.js, or GitHub Pages

## Next steps

Read the [Getting Started](getting-started.md) guide for setup.
Read [Core Concepts](core-concepts.md) to understand the data model.
Read the [Editor Guide](editor-guide.md) to learn the painting tools.
Read the [Viewer Guide](viewer-guide.md) to set up A to B navigation.
