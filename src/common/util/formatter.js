import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  altitudeFromMeters,
  altitudeUnitString,
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedUnitString,
  volumeFromLiters,
  volumeUnitString,
} from './converter';
import { prefixString } from './stringUtils';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export const formatBoolean = (value, t) => (value ? t('sharedYes') : t('sharedNo'));

export const formatNumber = (value, precision = 1) => Number(value.toFixed(precision));

export const formatPercentage = (value) => `${value}%`;

export const formatTemperature = (value) => `${value.toFixed(1)}°C`;

export const formatVoltage = (value, t) => `${value.toFixed(2)} ${t('sharedVoltAbbreviation')}`;

export const formatConsumption = (value, t) =>
  `${value.toFixed(2)} ${t('sharedLiterPerHourAbbreviation')}`;

export const formatTime = (value, format) => {
  if (value) {
    const d = dayjs(value).toDate();
    const dateConfig = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const minuteConfig = { hour: '2-digit', minute: '2-digit' };
    const secondConfig = { ...minuteConfig, second: '2-digit' };
    switch (format) {
      case 'date':
        return d.toLocaleDateString(undefined, dateConfig);
      case 'time':
        return d.toLocaleTimeString(undefined, secondConfig);
      case 'minutes':
        return d.toLocaleString(undefined, { ...dateConfig, ...minuteConfig });
      default:
        return d.toLocaleString(undefined, { ...dateConfig, ...secondConfig });
    }
  }
  return '';
};

export const formatStatus = (value, t) => t(prefixString('deviceStatus', value));

export const formatAlarm = (value, t) => {
  if (value) {
    return value
      .split(',')
      .map((alarm) => t(prefixString('alarm', alarm)))
      .join(', ');
  }
  return '';
};

export const formatCourse = (value) => {
  const courseValues = [
    '\u2191',
    '\u2197',
    '\u2192',
    '\u2198',
    '\u2193',
    '\u2199',
    '\u2190',
    '\u2196',
  ];
  let normalizedValue = (value + 45 / 2) % 360;
  if (normalizedValue < 0) {
    normalizedValue += 360;
  }
  return courseValues[Math.floor(normalizedValue / 45)];
};

export const formatDistance = (value, unit, t) =>
  `${distanceFromMeters(value, unit).toFixed(2)} ${distanceUnitString(unit, t)}`;

export const formatAltitude = (value, unit, t) =>
  `${altitudeFromMeters(value, unit).toFixed(2)} ${altitudeUnitString(unit, t)}`;

export const formatSpeed = (value, unit, t) =>
  `${speedFromKnots(value, unit).toFixed(2)} ${speedUnitString(unit, t)}`;

export const formatVolume = (value, unit, t) =>
  `${volumeFromLiters(value, unit).toFixed(2)} ${volumeUnitString(unit, t)}`;

export const formatNumericHours = (value, t) => {
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  return `${hours} ${t('sharedHourAbbreviation')} ${minutes} ${t('sharedMinuteAbbreviation')}`;
};

export const formatCoordinate = (key, value, unit) => {
  let hemisphere;
  let degrees;
  let minutes;
  let seconds;

  if (key === 'latitude') {
    hemisphere = value >= 0 ? 'N' : 'S';
  } else {
    hemisphere = value >= 0 ? 'E' : 'W';
  }

  switch (unit) {
    case 'ddm':
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = (value - degrees) * 60;
      return `${degrees}° ${minutes.toFixed(3)}' ${hemisphere}`;
    case 'dms':
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = Math.floor((value - degrees) * 60);
      seconds = Math.round((value - degrees - minutes / 60) * 3600);
      return `${degrees}° ${minutes}' ${seconds}" ${hemisphere}`;
    default:
      return `${value.toFixed(5)}°`;
  }
};

export const formatAddress = (position, unit) => {
  if (position.address) {
    return position.address;
  }
  const formattedLatitude = formatCoordinate('latitude', position.latitude, unit);
  const formattedLongitude = formatCoordinate('longitude', position.longitude, unit);
  return `${formattedLatitude}, ${formattedLongitude}`;
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'error';
    case 'unknown':
    default:
      return 'neutral';
  }
};

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;
const IDLE_SPEED_THRESHOLD_KMH = 2;

export const getDeviceUiStatus = (device, position) => {
  const now = Date.now();
  const lastUpdate = device.lastUpdate ? new Date(device.lastUpdate).getTime() : 0;
  if (now - lastUpdate > OFFLINE_THRESHOLD_MS) {
    return 'offline';
  }
  if (!position) {
    return 'offline';
  }
  const sat = position.attributes?.sat;
  if (sat !== undefined && sat !== null && sat < 3) {
    return 'pending';
  }
  const ignition = position.attributes?.ignition;
  const speedKmh = speedFromKnots(position.speed ?? 0, 'kmh');
  if (ignition === false) {
    return 'parking';
  }
  return speedKmh > IDLE_SPEED_THRESHOLD_KMH ? 'moving' : 'idle';
};

export const uiStatusToMapColor = (uiStatus) => {
  switch (uiStatus) {
    case 'moving':
      return 'success';
    case 'idle':
      return 'info';
    case 'parking':
      return 'error';
    case 'pending':
      return 'warning';
    case 'offline':
    default:
      return 'neutral';
  }
};

export const formatShortDuration = (ms) => {
  if (!ms || ms < 0) return '';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return '1m';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  return `${days}d`;
};

export const getBatteryStatus = (batteryLevel) => {
  if (batteryLevel >= 70) {
    return 'success';
  }
  if (batteryLevel > 30) {
    return 'warning';
  }
  return 'error';
};

export const formatNotificationTitle = (t, notification, includeId) => {
  if (notification.description) {
    return notification.description;
  }
  let title = t(prefixString('event', notification.type));
  if (notification.type === 'alarm') {
    const alarmString = notification.attributes.alarms;
    if (alarmString) {
      const alarms = alarmString.split(',');
      if (alarms.length > 1) {
        title += ` (${alarms.length})`;
      } else {
        title += ` ${formatAlarm(alarms[0], t)}`;
      }
    }
  }
  if (includeId) {
    title += ` [${notification.id}]`;
  }
  return title;
};
