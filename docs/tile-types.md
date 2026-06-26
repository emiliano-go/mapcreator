# Tile types

## Base tiles

Base tiles define the physical structure of each floor cell.

| Type | Traversable | Description |
|---|---|---|
| void | No | Empty or undefined cell |
| wall | No (with door overlay: yes) | Non-traversable obstacle |
| floor | Yes | Walkable hallway or area |
| stairs | Yes | Vertical connection between floors |
| elevator | Yes | Vertical connection with wider accessibility |
| outside | Configurable | Exterior area, non-traversable by default |
| dirt_path | Yes | Traversable exterior path |

## Overlays

Overlays add semantic information on top of base tiles.

| Overlay | Valid base | Description |
|---|---|---|
| door | wall | Marks a wall as passable. Weight is configurable in metadata. |
| exit_door | wall | Marks a wall as a primary exit. Treated like a door. |
| room | floor | Marks a floor area as a named room. Used for room region detection. |

## Tile metadata

Each tile can have optional metadata set in the property panel.

```ts
TileMeta {
  label?: string,
  accessible?: boolean,
  weight?: number,
  toFloorSuperior?: number,
  toFloorInferior?: number,
  connectedFloors?: number[],
  tags?: string[],
}
```

| Field | Applies to | Description |
|---|---|---|
| label | room, stairs, elevator | Display name for the tile |
| accessible | any traversable tile | When false, pathfinding avoids this tile with accessibleOnly mode |
| weight | any traversable tile | Pathfinding cost multiplier. Default is 1. Doors add a surcharge of 3. |
| toFloorSuperior | stairs | Floor index this stair connects to above |
| toFloorInferior | stairs | Floor index this stair connects to below |
| connectedFloors | elevator | List of floor indices this elevator serves |
| tags | any tile | Arbitrary string labels for grouping or filtering |

## Color palettes

Default tile colors are defined in `src/theme/tileStyles.ts`.

| Type | Dark theme fill | Light theme fill |
|---|---|---|
| wall | #554848 | #b0a8a0 |
| floor | #262636 | #ffffff |
| stairs | #fe9f2e (with arrow label) | #f59e0b |
| elevator | #8839ef (with arrow label) | #8b5cf6 |
| outside | #2a1e1e | #d4ccc4 |
| dirt_path | #4a3e2e (with tilde label) | #e8d5b7 |
| void | #0a0a0f | #f2f2f0 |

Overlay colors are semi-transparent and defined in the `overlayStyles` export.

## Next steps

Read the [Editor Guide](editor-guide.md) for painting instructions.
Read the [Configuration](configuration.md) for theme customization.
