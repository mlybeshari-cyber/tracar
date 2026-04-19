import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Rnd } from 'react-rnd';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Link,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import ShareIcon from '@mui/icons-material/Share';
import NavigationIcon from '@mui/icons-material/Navigation';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PendingIcon from '@mui/icons-material/Pending';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useRestriction, useDeviceReadonly } from '../util/permissions';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import usePositionAttributes from '../attributes/usePositionAttributes';
import fetchOrThrow from '../util/fetchOrThrow';
import { getDeviceUiStatus, formatTime } from '../util/formatter';
import { distanceFromMeters, distanceUnitString } from '../util/converter';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  desktopRoot: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: `calc(50% + ${desktopPadding} / 2)`,
    bottom: theme.spacing(3),
    transform: 'translateX(-50%)',
  },
  desktopCard: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
  },
  mobileRoot: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    bottom: 0,
    left: 0,
    right: 0,
  },
  mobileCard: {
    pointerEvents: 'auto',
    borderRadius: '16px 16px 0 0',
  },
}));

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');
  const distanceUnit = useAttributePreference('distanceUnit', 'km');
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );
  const positionAttributes = usePositionAttributes(t);

  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [todayDistance, setTodayDistance] = useState(null);

  useEffect(() => {
    if (!deviceId) return;
    const fetchTodayDistance = async () => {
      try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const from = startOfDay.toISOString();
        const to = now.toISOString();
        const response = await fetch(
          `/api/reports/summary?deviceId=${deviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setTodayDistance(data[0].distance);
          } else {
            setTodayDistance(0);
          }
        }
      } catch {
        setTodayDistance(0);
      }
    };
    fetchTodayDistance();
  }, [deviceId]);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position]);

  if (!device) {
    return null;
  }

  const uiStatus = getDeviceUiStatus(device, position);
  const lastSeen = device.lastUpdate ? formatTime(device.lastUpdate, 'datetime') : '--';

  const deviceImage = device?.attributes?.deviceImage;

  const distanceFormatted =
    todayDistance != null
      ? `${distanceFromMeters(todayDistance, distanceUnit).toFixed(2)} ${distanceUnitString(distanceUnit, t)}`
      : `0.00 ${distanceUnitString(distanceUnit, t)}`;

  const statusCircleColor = {
    moving: 'success.main',
    idle: 'info.main',
    parking: 'error.main',
    pending: 'warning.main',
    offline: 'grey.600',
  }[uiStatus] || 'grey.600';

  const statusLabel = {
    moving: 'Moving',
    idle: 'Idle',
    parking: 'Parked',
    pending: 'Pending',
    offline: 'Offline',
  }[uiStatus] || 'Offline';

  const statusLabelColor = {
    moving: 'success.main',
    idle: 'info.main',
    parking: 'error.main',
    pending: 'warning.main',
    offline: 'text.secondary',
  }[uiStatus] || 'text.secondary';

  const cardContent = (
    <>
      {deviceImage && (
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            image={`/api/media/${device.uniqueId}/${deviceImage}`}
            sx={{ height: 140 }}
          />
          <IconButton
            size="small"
            onClick={onClose}
            onTouchStart={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              mixBlendMode: 'difference',
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <CardContent sx={{ p: 2 }}>
        {!deviceImage && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: statusCircleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
                flexShrink: 0,
              }}
            >
              <FiberManualRecordIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {device.name}
            </Typography>
            <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1.5, mb: 1.5 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
          >
            <Typography variant="body2" fontWeight="bold" color={statusLabelColor}>
              {statusLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {lastSeen}
            </Typography>
          </Box>

          {position && positionItems.split(',').map((key) => {
            const posAttr = positionAttributes[key];
            const isProperty = !!posAttr?.property;
            const value = isProperty ? position[key] : position?.attributes?.[key];
            if (key !== 'address' && (value === undefined || value === null)) return null;
            return (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1, flexShrink: 0 }}>
                  {posAttr?.name || key}
                </Typography>
                <Typography variant="body2" component="span" sx={{ textAlign: 'right' }}>
                  <PositionValue
                    position={position}
                    property={isProperty ? key : undefined}
                    attribute={isProperty ? undefined : key}
                  />
                </Typography>
              </Box>
            );
          })}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              <RouteIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              {t('reportToday')}
            </Typography>
            <Typography variant="body2">
              {distanceFormatted}
            </Typography>
          </Box>

          {position && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Link component={RouterLink} to={`/position/${position.id}`} underline="hover" variant="caption">
                {t('sharedShowDetails')}
              </Link>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!shareDisabled && !user.temporary && (
            <Button
              variant="contained"
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => navigate(`/settings/device/${deviceId}/share`)}
              disabled={disableActions}
              sx={{ flex: 1, bgcolor: '#3F51B5', textTransform: 'none', '&:hover': { bgcolor: '#303F9F' } }}
            >
              {t('deviceShare')}
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<RouteIcon />}
            onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
            disabled={disableActions || !position}
            sx={{
              flex: 1,
              bgcolor: '#F57C00',
              textTransform: 'none',
              '&:hover': { bgcolor: '#E65100' },
            }}
          >
            {t('reportTrips')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<NavigationIcon />}
            onClick={() =>
              position &&
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${position.latitude},${position.longitude}`,
                '_blank',
              )
            }
            disabled={!position}
            sx={{
              flex: 1,
              bgcolor: '#388E3C',
              textTransform: 'none',
              '&:hover': { bgcolor: '#2E7D32' },
            }}
          >
            {t('sharedDirections')}
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            mt: 1,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Tooltip title={t('sharedExtra')}>
            <span>
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} disabled={!position}>
                <PendingIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('commandTitle')}>
            <span>
              <IconButton
                size="small"
                onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                disabled={disableActions}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('sharedEdit')}>
            <span>
              <IconButton
                size="small"
                onClick={() => navigate(`/settings/device/${deviceId}`)}
                disabled={disableActions || deviceReadonly}
              >
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('sharedRemove')}>
            <span>
              <IconButton
                size="small"
                onClick={() => setRemoving(true)}
                disabled={disableActions || deviceReadonly}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </>
  );

  return (
    <>
      {desktop ? (
        <div className={classes.desktopRoot}>
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={`${classes.desktopCard} draggable-header`}>
              {cardContent}
            </Card>
          </Rnd>
        </div>
      ) : (
        <div className={classes.mobileRoot}>
          <Card elevation={6} className={classes.mobileCard}>
            {cardContent}
          </Card>
        </div>
      )}
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('deviceShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
