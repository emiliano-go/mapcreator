# Configuration

## Map config

`src/map.config.ts` is the main configuration file you edit for each building.

```ts
export const mapConfig = {
  buildingName: 'My Building',
  defaultMap: 'maps/main.json',
  tileSize: 24,
  animationDelay: 40,
  allowDiagonal: false,
  theme: 'default',
  poi: [
    { label: 'Entrance', floor: 0, row: 10, col: 5 },
  ],
}
```

### Fields

| Field | Type | Default | Description |
|---|---|---|---|
| buildingName | string | required | Name displayed in the editor and viewer |
| defaultMap | string | required | Path to the map JSON file |
| tileSize | number | 24 | Pixel size of each tile on the canvas |
| animationDelay | number | 40 | Milliseconds between tiles during path animation |
| allowDiagonal | boolean | false | Allow diagonal movement in pathfinding |
| theme | string | 'default' | Theme selector for tile styles |
| poi | POI[] | [] | Points of interest displayed on the map |

## Theme

### Tile styles

Edit `src/theme/tileStyles.ts` to customize tile colors.

The file exports two palettes:

- `tileStylesLight` for light mode
- `tileStylesDark` for dark mode

Each palette maps every `TileType` to a style object.

```ts
TileStyle {
  fill: string,
  stroke: string,
  label?: string,
  opacity?: number,
  cssClass?: string,
}
```

Overlay styles are exported separately as `overlayStyles` for door, exit_door, and room.

Editor-specific colors (path highlight, selection, markers) are in `editorStyles`.

### CSS variables

Edit `src/theme/vars.css` to change the UI shell colors.

```css
:root {
  --bg-primary: #0f0f14;
  --bg-secondary: #1a1a24;
  --text-primary: #e0e0e8;
  --text-secondary: #8888a0;
  --border-color: #2a2a3a;
  --accent: #6c6cf0;
  --accent-hover: #8a8af5;
}
```

## Keyboard shortcuts

Shortcuts are stored in localStorage under `mapcreator_keybinds`.
Default shortcuts are loaded from `public/keybinds.txt`.
You can rebind them in the keybinds panel.

Categories: Tools, Edit, File, Mode, View, Floors, Help.

## Next steps

Read the [Editor Guide](editor-guide.md) for painting instructions.
Read the [Deployment](deployment.md) guide for hosting options.
