import { CONTAINER_WIDTH, CONTENT_OFFSET } from '../utils';

import { StyleSheet } from 'react-native';

const GREY_COLOR = '#00000029';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: CONTENT_OFFSET,
    width: CONTAINER_WIDTH,
  },
  timeRow: {
    flex: 0,
  },
  timeLabelLine: {
    // height: 1,
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: GREY_COLOR,
    paddingHorizontal: 10,
    justifyContent: 'center',
    // position: 'absolute',
    // right: 0,
    // left: 0,
  },
  eventsColumn: {
    flex: 1,
    borderColor: GREY_COLOR,
    borderLeftWidth: 1,
  },
  eventsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'transparent',
  },
});

export default styles;
