import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Rnd } from 'react-rnd';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import ShareIcon from '@mui/icons-material/Share';
import NavigationIcon from '@mui/icons-material/Navigation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import { useRestriction } from '../util/permissions';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
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

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');
  const distanceUnit = useAttributePreference('distanceUnit', 'km');

  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);

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
  const isOnline = uiStatus !== 'offline';
  const lastSeen = device.lastUpdate ? formatTime(device.lastUpdate, 'datetime') : '--';

  const address =
    position?.address ||
    (position ? `${position.latitude.toFixed(5)}°, ${position.longitude.toFixed(5)}°` : '--');

  const distanceRaw = position?.attributes?.distance;
  const distanceFormatted =
    distanceRaw != null
      ? `${distanceFromMeters(distanceRaw, distanceUnit).toFixed(2)} ${distanceUnitString(distanceUnit, t)}`
      : `0 ${distanceUnitString(distanceUnit, t)}`;

  const cardContent = (
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'grey.900',
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

      <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1.5, mb: 1.5 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
        >
          <Typography
            variant="body2"
            fontWeight="bold"
            color={isOnline ? 'success.main' : 'error.main'}
          >
            {isOnline ? t('deviceStatusOnline') : t('deviceStatusOffline')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {lastSeen}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
          <LocationOnIcon
            sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5, mt: 0.2, flexShrink: 0 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {address}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RouteIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary">
            {`${distanceFormatted} ${t('reportToday').toLowerCase()}`}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!shareDisabled && !user.temporary && (
          <Button
            variant="contained"
            size="small"
            startIcon={<ShareIcon />}
            onClick={() => navigate(`/settings/device/${deviceId}/share`)}
            disabled={disableActions}
            sx={{ flex: 1, bgcolor: 'primary.main', textTransform: 'none' }}
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
            bgcolor: 'warning.main',
            textTransform: 'none',
            '&:hover': { bgcolor: 'warning.dark' },
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
            bgcolor: 'success.main',
            textTransform: 'none',
            '&:hover': { bgcolor: 'success.dark' },
          }}
        >
          {t('sharedDirections')}
        </Button>
      </Box>
    </CardContent>
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
