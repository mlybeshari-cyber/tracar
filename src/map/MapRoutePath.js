import { useTheme } from '@mui/material/styles';
import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { useAttributePreference } from '../common/util/preferences';

const GAP_MS = 120000;

const splitIntoTrips = (positions, gapMs = GAP_MS) => {
  const trips = [];
  let current = [];
  for (let i = 0; i < positions.length; i += 1) {
    if (i === 0) {
      current.push(positions[i]);
    } else {
      const prev = new Date(positions[i - 1].fixTime).getTime();
      const curr = new Date(positions[i].fixTime).getTime();
      if (curr - prev > gapMs) {
        if (current.length > 0) trips.push(current);
        current = [positions[i]];
      } else {
        current.push(positions[i]);
      }
    }
  }
  if (current.length > 0) trips.push(current);
  return trips;
};

const formatStopDuration = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0 && s > 0) return `${m} min ${s} sec`;
  if (m > 0) return `${m} min`;
  return `${s} sec`;
};

const MapRoutePath = ({ positions }) => {
  const id = useId();

  const theme = useTheme();

  const reportColor = useSelector((state) => {
    const position = positions?.find(() => true);
    if (position) {
      const attributes = state.devices.items[position.deviceId]?.attributes;
      if (attributes) {
        const color = attributes['web.reportColor'];
        if (color) {
          return color;
        }
      }
    }
    return null;
  });

  const mapLineWidth = useAttributePreference('mapLineWidth', 4);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      source: id,
      id: `${id}-line`,
      type: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });

    map.addSource(`${id}-stops`, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      source: `${id}-stops`,
      id: `${id}-stops-label`,
      type: 'symbol',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': findFonts(map),
        'text-size': 12,
        'text-allow-overlap': true,
        'icon-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.85)',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.5,
      },
    });

    return () => {
      if (map.getLayer(`${id}-stops-label`)) {
        map.removeLayer(`${id}-stops-label`);
      }
      if (map.getSource(`${id}-stops`)) {
        map.removeSource(`${id}-stops`);
      }
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, []);

  useEffect(() => {
    const lineColor = reportColor || theme.palette.geometry.main || '#673ab7';
    const trips = splitIntoTrips(positions);

    const lineFeatures = trips.map((trip) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: trip.map((p) => [p.longitude, p.latitude]),
      },
      properties: {
        color: lineColor,
        width: mapLineWidth,
        opacity: mapLineOpacity,
      },
    }));

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: lineFeatures,
    });

    const stopFeatures = [];
    for (let i = 0; i < trips.length - 1; i += 1) {
      const lastPos = trips[i][trips[i].length - 1];
      const firstPos = trips[i + 1][0];
      const gapMs = new Date(firstPos.fixTime).getTime() - new Date(lastPos.fixTime).getTime();
      stopFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lastPos.longitude, lastPos.latitude],
        },
        properties: {
          label: `${i + 2} ⏱ ${formatStopDuration(gapMs)}`,
        },
      });
    }

    map.getSource(`${id}-stops`)?.setData({
      type: 'FeatureCollection',
      features: stopFeatures,
    });
  }, [theme, positions, reportColor, mapLineWidth, mapLineOpacity]);

  return null;
};

export default MapRoutePath;
