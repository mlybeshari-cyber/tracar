import { useState, useCallback, useEffect, useRef } from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import StatusCard from '../common/components/StatusCard';
import BottomMenu from '../common/components/BottomMenu';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import usePersistentResize from '../common/util/usePersistentResize';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      margin: theme.spacing(1.5),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 6,
    flexShrink: 0,
  },
  resizeHandleX: {
    position: 'absolute',
    top: 0,
    right: -3,
    bottom: 0,
    width: 6,
    cursor: 'ew-resize',
    zIndex: 10,
    pointerEvents: 'auto',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
  },
  resizeHandleY: {
    height: 6,
    flexShrink: 0,
    cursor: 'ns-resize',
    pointerEvents: 'auto',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const defaultPanelWidth = parseInt(theme.dimensions.drawerWidthDesktop, 10);
  const maxListHeight = Math.round(window.innerHeight * 0.8);

  const [panelWidth, startResizeWidth] = usePersistentResize(
    'devicesPanelWidth',
    defaultPanelWidth,
    240,
    600,
    'x',
  );
  const [listHeight, startResizeHeight] = usePersistentResize(
    'devicesPanelListHeight',
    null,
    150,
    maxListHeight,
    'y',
  );

  const middleRef = useRef(null);

  const handleHeightMouseDown = useCallback(
    (e) => {
      const currentHeight = listHeight ?? middleRef.current?.clientHeight ?? 400;
      startResizeHeight(e, currentHeight);
    },
    [listHeight, startResizeHeight],
  );

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(
    keyword,
    filter,
    filterSort,
    filterMap,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  );

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onEventsClick={onEventsClick}
          sidebarWidth={panelWidth}
        />
      )}
      <div
        className={classes.sidebar}
        style={desktop ? { width: panelWidth } : undefined}
      >
        <Paper square elevation={3} className={classes.header}>
          <MainToolbar
            filteredDevices={filteredDevices}
            devicesOpen={devicesOpen}
            setDevicesOpen={setDevicesOpen}
            keyword={keyword}
            setKeyword={setKeyword}
            filter={filter}
            setFilter={setFilter}
            filterSort={filterSort}
            setFilterSort={setFilterSort}
            filterMap={filterMap}
            setFilterMap={setFilterMap}
          />
        </Paper>
        <div
          ref={middleRef}
          className={classes.middle}
          style={
            desktop && listHeight !== null
              ? { flex: 'none', height: listHeight }
              : undefined
          }
        >
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onEventsClick={onEventsClick}
              />
            </div>
          )}
          <Paper
            square
            className={classes.contentList}
            style={devicesOpen ? {} : { visibility: 'hidden' }}
          >
            <DeviceList devices={filteredDevices} />
          </Paper>
        </div>
        {desktop && (
          <div className={classes.resizeHandleY} onMouseDown={handleHeightMouseDown} />
        )}
        <div className={classes.footer}>
          <BottomMenu />
        </div>
        {desktop && (
          <div className={classes.resizeHandleX} onMouseDown={startResizeWidth} />
        )}
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      {selectedDeviceId && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={desktop ? panelWidth : theme.dimensions.drawerWidthDesktop}
        />
      )}
    </div>
  );
};

export default MainPage;
