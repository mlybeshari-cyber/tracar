import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { Box, ListItemButton, Typography } from '@mui/material';
import { devicesActions } from '../store';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { speedFromKnots } from '../common/util/converter';
import { useAdministrator } from '../common/util/permissions';

const useStyles = makeStyles()((theme) => ({
  row: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing(1),
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  success: {
    backgroundColor: theme.palette.success.main,
  },
  error: {
    backgroundColor: theme.palette.error.main,
  },
  neutral: {
    backgroundColor: theme.palette.neutral.main,
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
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes, cx } = useStyles();
  const dispatch = useDispatch();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const statusColor = getStatusColor(item.status);
  const lastSeen = item.lastUpdate ? formatTime(item.lastUpdate, 'time') : '--';
  const speed =
    position?.speed != null ? `${speedFromKnots(position.speed, 'kmh').toFixed(1)} km/h` : '--';

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
          <Box className={cx(classes.statusDot, classes[statusColor])} />
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
        </Box>
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
