# building-map

> GitHub Template Repository para crear, estilizar y navegar mapas de edificios con grafo A→B.

---

## ✨ Cómo usar este template

### 1. Crear fork

Hacé click en **"Use this template"** en GitHub → creá tu repo (`mi-edificio`).

### 2. Configurar

Editá `src/map.config.ts`:

```ts
export const mapConfig = {
  buildingName: 'Mi Edificio',
  defaultMap: 'maps/main.json',
  tileSize: 24,       // px por celda
  animationDelay: 40,  // ms entre tiles del path animado
  allowDiagonal: false,
  theme: 'default',
  poi: [
    { label: 'Entrada', floor: 0, row: 10, col: 5 },
  ],
}
```

### 3. Personalizar colores

Editá `src/theme/tileStyles.ts` — los colores de cada tipo de tile (wall, floor, room, door, stairs, elevator, outside, void).

### 4. Desarrollar

```bash
pnpm install
pnpm dev        # → abre el editor en http://localhost:5173
```

### 5. Pintar el mapa

Usá el editor visual:

1. Seleccioná un tile de la toolbar (wall, floor, room, door, etc.)
2. Hacé click izquierdo en el canvas para pintar
3. Click derecho para borrar
4. Scroll para zoom, click medio + arrastrar para pan
5. Click en un tile pintado → panel de metadata (label, peso, accesibilidad)
6. Usá el manager de pisos para agregar/quitar/reordenar

### 6. Exportar

Click en **Exportar** → descarga `maps/main.json`. Guardalo en la carpeta `maps/`.

### 7. Commit & deploy

```bash
git add maps/main.json
git commit -m "feat: add building map"
git push
```

Si habilitás GitHub Pages, el viewer se deploya automáticamente.

---

## 🧱 Estructura del proyecto

```
├── src/
│   ├── core/          ← NO TOCAR (tipos, grafo, pathfinding, validación)
│   ├── editor/        ← NO TOCAR (canvas painter, toolbar)
│   ├── viewer/        ← NO TOCAR (UI de navegación A→B)
│   ├── theme/         ← EDITÁ ACA (tileStyles.ts, vars.css)
│   └── map.config.ts  ← CONFIGURÁ ACA
├── maps/              ← archivos .json generados por el editor
└── tests/
```

### 🚫 No tocar

- `src/core/` — lógica pura sin UI. GraphBuilder, Pathfinder (A*), serializer, validator Zod.
- `src/editor/` — canvas editor con pan/zoom/paint, toolbar, floor manager.
- `src/viewer/` — viewer read-only con pathfinding interactivo A→B.

---

## 🧪 Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Dev server con HMR |
| `pnpm build` | Compilar para producción |
| `pnpm test` | Correr tests (Vitest) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |

---

## 📦 Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18 + TypeScript 6 |
| Build | Vite 8 |
| Estilos | Tailwind CSS v4 + CSS vars |
| Canvas | HTML5 Canvas API (sin librerías) |
| Pathfinding | A* con heurística Manhattan (implementación propia) |
| Validación | Zod 4 |
| Testing | Vitest + @testing-library/react |
| CI | GitHub Actions |

**Sin dependencias de mapas externas.** El proyecto es liviano y portátil.

---

## 🗺️ Tile types

| Tile | Descripción |
|---|---|
| `void` | Celda vacía / sin definir |
| `wall` | Obstáculo no transitable |
| `floor` | Pasillo / área transitable |
| `room` | Sala (nombre configurable en metadata) |
| `door` | Conexión entre zonas, peso configurable |
| `stairs` | Conexión vertical entre pisos |
| `elevator` | Conexión vertical con mayor accesibilidad |
| `outside` | Exterior (no transitable por defecto) |

---

## 🔍 Pathfinding (A→B)

1. Seleccioná **Punto A** en el panel del viewer
2. Hacé click en una celda del mapa
3. Seleccioná **Punto B** y hacé click en otra celda
4. Click en **"Encontrar camino"**
5. El camino se resalta y anima tile a tile

Opciones disponibles:
- **Solo accesible**: ignora tiles marcados como no accesibles
- Cambio de piso automático si hay stairs/elevator

---

## 📄 Licencia

MIT
