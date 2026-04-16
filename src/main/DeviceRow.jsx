import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { Box, ListItemButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import KeyIcon from '@mui/icons-material/Key';
import KeyOffIcon from '@mui/icons-material/KeyOff';
import { devicesActions } from '../store';
import { formatTime, getDeviceUiStatus } from '../common/util/formatter';
import { speedFromKnots } from '../common/util/converter';
import { useAdministrator } from '../common/util/permissions';

const useStyles = makeStyles()((theme) => ({
  row: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing(1),
  },
  nameCell: {
    flex: 1,
    minWidth: 0,
  },
  timeCell: {
    flexShrink: 0,
    width: 82,
    textAlign: 'right',
    color: theme.palette.text.secondary,
  },
  speedCell: {
    flexShrink: 0,
    width: 68,
    textAlign: 'right',
    color: theme.palette.text.secondary,
  },
  ignitionCell: {
    flexShrink: 0,
    width: 14,
    textAlign: 'center',
  },
  voltageCell: {
    flexShrink: 0,
    width: 56,
    textAlign: 'right',
    color: theme.palette.text.secondary,
  },
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const StatusIndicator = ({ status, course }) => {
  const theme = useTheme();
  const baseCircle = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  switch (status) {
    case 'pending':
      return (
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderBottom: `13px solid ${theme.palette.warning.main}`,
            flexShrink: 0,
          }}
        />
      );
    case 'parking':
      return (
        <Box sx={{ ...baseCircle, bgcolor: 'error.main' }}>
          <Typography
            component="span"
            sx={{ color: 'white', fontSize: '8px', lineHeight: 1, fontWeight: 'bold' }}
          >
            P
          </Typography>
        </Box>
      );
    case 'idle':
      return <Box sx={{ ...baseCircle, bgcolor: 'info.main' }} />;
    case 'moving':
      return (
        <Box
          sx={{
            ...baseCircle,
            bgcolor: 'success.main',
            transform: `rotate(${course ?? 0}deg)`,
          }}
        >
          <Typography component="span" sx={{ color: 'white', fontSize: '9px', lineHeight: 1 }}>
            ↑
          </Typography>
        </Box>
      );
    case 'offline':
    default:
      return <Box sx={{ ...baseCircle, bgcolor: 'grey.500' }} />;
  }
};

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const uiStatus = getDeviceUiStatus(item, position);
  const lastSeen = item.lastUpdate ? formatTime(item.lastUpdate, 'time') : '--';
  const speed =
    position?.speed != null ? `${speedFromKnots(position.speed, 'kmh').toFixed(1)} km/h` : '--';

  const ignition = position?.attributes?.ignition;
  const powerRaw = position?.attributes?.power;
  const powerNum = Number(powerRaw);
  const hasPower = powerRaw !== undefined && powerRaw !== null && Number.isFinite(powerNum);
  const voltageText = hasPower ? `${powerNum.toFixed(2)} V` : '';

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={selectedDeviceId === item.id ? classes.selected : null}
        sx={{ minHeight: 44, maxHeight: 44, py: 0, px: 1 }}
      >
        <Box className={classes.row}>
          <StatusIndicator status={uiStatus} course={position?.course} />
          <Box className={classes.nameCell}>
            <Typography variant="body2" noWrap>
              {item.name}
            </Typography>
          </Box>
          <Box className={classes.timeCell}>
            <Typography variant="caption" noWrap>
              {lastSeen}
            </Typography>
          </Box>
          <Box className={classes.speedCell}>
            <Typography variant="caption" noWrap>
              {speed}
            </Typography>
          </Box>
          <Box className={classes.ignitionCell}>
            {ignition === true && (
              <KeyIcon sx={{ fontSize: 14, color: 'success.main', display: 'block' }} />
            )}
            {ignition === false && (
              <KeyOffIcon sx={{ fontSize: 14, color: 'text.disabled', display: 'block' }} />
            )}
          </Box>
          {voltageText ? (
            <Box className={classes.voltageCell}>
              <Typography variant="caption" noWrap>
                {voltageText}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
