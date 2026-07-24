export const OSM_RASTER_STYLE = {
  version: 8,
  name: 'OpenStreetMap Raster',
  sources: {
    'osm-raster-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';

// MapLibre uses [longitude, latitude] for coordinates
export const DEFAULT_CAMERA = {
  centerCoordinate: [35.0, 39.0] as [number, number],
  zoomLevel: 4.5,
};

export const CATEGORY_COLORS: Record<string, string> = {
  market: '#ef4444',
  eczane: '#10b981',
  restoran: '#f59e0b',
  lokanta: '#f59e0b',
  kafe: '#ec4899',
  otomotiv: '#3b82f6',
  giyim: '#8b5cf6',
  tekstil: '#8b5cf6',
  elektronik: '#06b6d4',
  kırtasiye: '#14b8a6',
  diğer: '#64748b',
};

export function getCategoryColor(categoryName?: string | null): string {
  if (!categoryName) return '#64748b';
  const normalized = categoryName.trim().toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return '#64748b';
}
