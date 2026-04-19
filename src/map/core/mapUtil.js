import { parse, stringify } from 'wellknown';
import circle from '@turf/circle';

export const loadImage = (url) =>
  new Promise((imageLoaded) => {
    const image = new Image();
    image.onload = () => imageLoaded(image);
    image.src = url;
  });

const canvasTintImage = (image, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');

  context.save();
  context.fillStyle = color;
  context.globalAlpha = 1;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'destination-atop';
  context.globalAlpha = 1;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.restore();

  return canvas;
};

export const prepareIcon = (background, icon, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = background.width * devicePixelRatio;
  canvas.height = background.height * devicePixelRatio;
  canvas.style.width = `${background.width}px`;
  canvas.style.height = `${background.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  if (icon) {
    const iconRatio = 0.5;
    const imageWidth = canvas.width * iconRatio;
    const imageHeight = canvas.height * iconRatio;
    context.drawImage(
      canvasTintImage(icon, color),
      (canvas.width - imageWidth) / 2,
      (canvas.height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  }

  return context.getImageData(0, 0, canvas.width, canvas.height);
};

export const reverseCoordinates = (it) => {
  if (!it) {
    return it;
  }
  if (Array.isArray(it)) {
    if (it.length === 2 && typeof it[0] === 'number' && typeof it[1] === 'number') {
      return [it[1], it[0]];
    }
    return it.map((it) => reverseCoordinates(it));
  }
  return {
    ...it,
    coordinates: reverseCoordinates(it.coordinates),
  };
};

export const geofenceToFeature = (theme, item) => {
  let geometry;
  if (item.area.indexOf('CIRCLE') > -1) {
    const coordinates = item.area
      .replace(/CIRCLE|\(|\)|,/g, ' ')
      .trim()
      .split(/ +/);
    const options = { steps: 32, units: 'meters' };
    const polygon = circle(
      [Number(coordinates[1]), Number(coordinates[0])],
      Number(coordinates[2]),
      options,
    );
    geometry = polygon.geometry;
  } else {
    geometry = reverseCoordinates(parse(item.area));
  }
  return {
    id: item.id,
    type: 'Feature',
    geometry,
    properties: {
      name: item.name,
      color: item.attributes.color || theme.palette.geometry.main,
      width: item.attributes.mapLineWidth || 2,
      opacity: item.attributes.mapLineOpacity || 1,
    },
  };
};

export const geometryToArea = (geometry) => stringify(reverseCoordinates(geometry));

export const prepareStatusMarker = (color, glyph) => {
  const size = 40;
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  const cx = (size * dpr) / 2;
  const cy = (size * dpr) / 2;
  const innerR = cx * 0.80;
  const r = innerR + 1.5 * dpr;

  // White outer ring with soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 4 * dpr;
  ctx.shadowOffsetY = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // Inner colored disc
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Glyph
  ctx.fillStyle = '#ffffff';

  if (glyph === 'arrow') {
    // MUI NavigationIcon path inside a 24x24 viewBox:
    // M12 2 L4.5 20.29 L5.21 21 L12 18 L18.79 21 L19.5 20.29 Z
    const target = innerR * 1.4;
    const scale = target / 24;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-12, -11.5);              // SVG y-range is [2,21]; visual centroid ~11.5, slightly above geometric midpoint 11
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(4.5, 20.29);
    ctx.lineTo(5.21, 21);
    ctx.lineTo(12, 18);
    ctx.lineTo(18.79, 21);
    ctx.lineTo(19.5, 20.29);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (glyph === 'pause') {
    // Two vertical bars, slightly dropped for optical centering
    const barW = innerR * 0.22;
    const barH = innerR * 0.62;
    const barGap = innerR * 0.14;
    const yBias = 1 * dpr;
    ctx.fillRect(cx - barGap - barW, cy - barH / 2 + yBias, barW, barH);
    ctx.fillRect(cx + barGap, cy - barH / 2 + yBias, barW, barH);
  } else {
    // Letter / symbol glyphs (P, ?, ×) — bold, sans-serif, slight downward bias
    const fontSize = Math.round(size * dpr * 0.46);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const yBias = 1 * dpr;
    ctx.fillText(glyph, cx, cy + yBias);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

export const findFonts = (map) => {
  const { glyphs } = map.getStyle();
  if (glyphs.startsWith('https://tiles.openfreemap.org')) {
    return ['Noto Sans Regular'];
  }
  return ['Open Sans Regular', 'Arial Unicode MS Regular'];
};
