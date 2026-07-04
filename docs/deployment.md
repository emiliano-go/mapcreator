---
seo:
  title: Deployment - MapCreator Documentation
  canonical: https://emiliano-go.github.io/mapcreator/deployment
  robots: index,follow
  og:
    type: website
    title: Deployment - MapCreator Documentation
    description: Static build, Node.js server, Docker, nginx, GitHub Pages, and viewer mode.
    url: https://emiliano-go.github.io/mapcreator/deployment
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:width: 1200
    image:height: 630
    image:alt: MapCreator documentation
    site_name: MapCreator Documentation
    locale: en_US
  twitter:
    card: summary_large_image
    title: Deployment - MapCreator Documentation
    description: Static build, Node.js server, Docker, nginx, GitHub Pages, and viewer mode.
    image: https://emiliano-go.github.io/mapcreator/assets/images/hero.png
    image:alt: MapCreator documentation
    site: '@emiliano_go_'
  description: Static build, Node.js server, Docker, nginx, GitHub Pages, and viewer mode.
---

# Deployment

## Build static files

```bash
pnpm build
```

Output goes to `dist/`.
Serve the `dist/` directory with any static file server.

## Node.js server

The `server.js` file provides a production Node.js server with an export API.

```bash
node server.js
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| PORT | 80 | HTTP port |
| STATIC_DIR | ./dist | Static files directory |
| EXPORT_DIR | ./exports | Directory for exported maps |

Endpoints:

- `GET /` serves the static files
- `POST /api/export` saves a map JSON to EXPORT_DIR
- `GET /api/export` lists saved exports
- All other routes fall back to index.html for SPA routing

## Docker

```bash
docker build -t mapcreator .
docker run -p 8080:80 mapcreator
```

Or use docker-compose:

```bash
docker-compose up
```

The compose file mounts `./exports:/exports` for persistent map exports.

## nginx

An `nginx.conf` is included for nginx deployment.
It serves static files with SPA fallback and sets cache headers for keybinds.txt.

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## GitHub Pages

1. Set the Vite base path in `vite.config.ts` to your repo name
2. Enable GitHub Pages in your repo settings
3. Push to the branch configured for Pages

The app loads the map specified in `map.config.ts`.
Place your exported JSON files in the `maps/` directory and commit them.

## Viewer mode

Append `?view` to the URL to load the viewer instead of the editor.
Optionally append `&map=path/to/map.json` to load a specific map file.

## Next steps

Read the [Configuration](configuration.md) reference for setup options.
Read the [Viewer Guide](viewer-guide.md) for embedding the viewer.
