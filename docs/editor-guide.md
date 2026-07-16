---
seo:
  title: Editor Guide - MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/editor-guide
  robots: index,follow
  og:
    type: website
    title: Editor Guide - MapCreator Documentation
    description: Full guide to the canvas-based tile painter, tools, layers, floor management, and simulation mode.
    url: https://emiliano-go.github.io/mapcreator/editor-guide
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:width: 1200
    image:height: 630
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: Editor Guide - MapCreator Documentation
    description: Full guide to the canvas-based tile painter, tools, layers, floor management, and simulation mode.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: Full guide to the canvas-based tile painter, tools, layers, floor management, and simulation mode.
---

# Editor Guide

The editor is a full-featured canvas-based tile painter.
It is the default view when you open the app.

## Layout

- **Menu bar**: top bar with building name, export/import buttons, undo/redo, mode switcher, validation badge, theme toggle, and keybinds button
- **Tool palette**: left sidebar with tool selection, base/overlay tab, and straight mode toggle
- **Canvas**: center area where you paint your map
- **Property panel**: right sidebar showing tile metadata or floor settings
- **Floor tabs**: bottom area for managing floors

## Tools

### Base tools

| Tool | Description |
|---|---|
| Wall | Non-traversable obstacle |
| Floor | Traversable hallway or area |
| Stairs | Vertical connection between floors |
| Elevator | Vertical connection with wider accessibility |
| Outside | Exterior area (non-traversable by default) |
| Dirt Path | Traversable exterior path |
| Void | Empty or undefined cell |

### Overlay tools

| Overlay | Valid on | Description |
|---|---|---|
| Door | Wall | Connection between zones, configurable weight |
| Exit Door | Wall | Marked as primary exit |
| Room | Floor | Named area, detected as a region |

### Action tools

| Tool | Shortcut | Description |
|---|---|---|
| Select | V | Click a tile to inspect its metadata |
| Eraser | E | Click or drag to erase tiles |
| Fill | G | Flood fill contiguous same-type tiles |
| Eyedropper | I | Pick the tile type from a clicked cell |
| Fill Room | R | Flood fill floor tiles enclosed by walls, applies room overlay |

## Painting

Left-click on the canvas to place the current tool.
Left-click and drag to paint continuously.
Right-click to erase a single tile.
Right-click and drag to erase continuously.

Hold Shift while clicking to enter straight line mode. Click a start tile, move the mouse, and click an end tile. The line is constrained to the row or column.

When the Room, Floor, Void or Wall tool is selected, it draws a rectangle by default. Press Shift to temporarily draw single tiles instead.

## Selection

| Action | Input |
|---|---|
| Duplicate block | Select block then Alt + drag |
| Copy | Ctrl + C |
| Paste | Ctrl + V |
| Cut | Ctrl + X |
| Flip horizontal | Select block then press Flip Horizontal Button |
| Flip vertical | Select block then press Flip Vertical Button |

## Layers

The editor has two layers visible in the tool palette.

- **Base layer**: the physical tile type (wall, floor, stairs, etc.)
- **Overlay layer**: semantic labels placed on top of base tiles (door, exit door, room)

Switch between them with the tab buttons in the tool palette.

## Canvas controls

| Action | Input |
|---|---|
| Pan | Middle mouse drag or Shift + left-click drag |
| Zoom | Scroll wheel |
| Select | Click with Select tool (V) |
| Inspect | Click a painted tile with Select tool |

## Floor management

The floor tabs at the bottom let you:

- Add a new floor
- Duplicate a floor (full copy or size only)
- Rename a floor
- Reorder floors by dragging tabs
- Remove a floor

Each floor has its own grid dimensions and tile data.
Floors are assigned to a building.

## Property panel

When no tile is selected, the property panel shows floor settings.
When a tile is selected, it shows:

- Position (row, col)
- Base type and overlay type
- Room region info
- Weight (pathfinding cost)
- Accessibility toggle
- Stairs connections (toFloorSuperior, toFloorInferior)
- Elevator connections (connectedFloors)
- Tags

## Undo and redo

The editor maintains a history stack of up to 50 entries.
Use Ctrl+Z to undo and Ctrl+Shift+Z to redo.

## Keyboard shortcuts

37 customizable shortcuts across 7 categories: Tools, Edit, File, Mode, View, Floors, and Help.

Open the keybinds panel from the menu bar to view, rebind, import, or export shortcuts. Shortcuts are saved to localStorage.

## Simulation mode

Switch to Simulate mode from the menu bar.
The right panel shows destination selectors and pathfinding options.
Select a start and end destination, then click Find Path.
The path is rendered on the canvas with an animated head.

## Preview mode

Switch to Preview mode to see the map without tool overlays.
This matches what the viewer displays.

## Data persistence

All maps are saved automatically to your browser's localStorage. Your work persists across sessions without manual saving.

## Next steps

Read the [Viewer Guide](viewer-guide.md) for the read-only navigation interface.
Read the [Tile Types](tile-types.md) reference.
Read the [Configuration](configuration.md) reference.
