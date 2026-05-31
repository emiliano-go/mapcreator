export const mapConfig = {
  buildingName: 'Edificio Principal',
  defaultMap: 'maps/main.json',
  tileSize: 24,
  animationDelay: 40,
  allowDiagonal: false,
  theme: 'default',
  poi: [
    { label: 'Entrada', floor: 0, row: 10, col: 5 },
    { label: 'Cafeter\u00EDa', floor: 1, row: 4, col: 12 },
  ],
}

export type MapConfig = typeof mapConfig
