---
seo:
  title: Viewer Guide - MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/viewer-guide
  robots: index,follow
  og:
    type: website
    title: Viewer Guide - MapCreator Documentation
    description: Using the read-only navigation interface, finding paths, destination selectors, and embedding.
    url: https://emiliano-go.github.io/mapcreator/viewer-guide
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:width: 1200
    image:height: 630
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: Viewer Guide - MapCreator Documentation
    description: Using the read-only navigation interface, finding paths, destination selectors, and embedding.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: Using the read-only navigation interface, finding paths, destination selectors, and embedding.
---

# Viewer Guide

The viewer is a read-only navigation interface.
It lets users find paths between destinations on the map.
It is loaded by adding `?view` to the URL.

## Layout

- **Header**: map name with a floor selector
- **Canvas**: rendered map with no editing controls
- **Path panel**: destination selectors and pathfinding options

## Finding a path

1. Select a starting destination from the "From" dropdown
2. Select an ending destination from the "To" dropdown
3. Click "Find Path"

The path is highlighted on the canvas with an animated head moving along it.

### Destinations

Destinations are automatically derived from the map data.
They include rooms, exits, doors, stairs, and elevators.
Each destination has a label, floor, and tile position.

### Options

| Option | Description |
|---|---|
| Accessible only | Skip tiles marked as non-accessible |
| Prefer elevator | Try elevator routes before stairs |
| No outside | Prevent paths from using outside tiles |
| Max floor changes | Limit how many times the path can change floors |

## Floor selector

Click a floor tab to switch the visible floor.
If the path spans multiple floors, the view switches automatically during animation.

## Click to set points

Instead of using the dropdowns, you can click directly on the canvas.
Click a traversable tile to set point A.
Hold Shift and click to set point B.
Then click Find Path.

## Embedding the viewer

The viewer can be embedded in any page by loading the built app with `?view` and your map file.

```html
<iframe src="https://your-domain.com/?view&map=maps/main.json"></iframe>
```

## Next steps

Read the [Pathfinding](pathfinding.md) reference for algorithm details.
Read the [Deployment](deployment.md) guide for hosting options.
