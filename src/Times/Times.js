import { Text, View } from 'react-native';

import PropTypes from 'prop-types';
import React from 'react';
import { getTimeLabelHeight } from '../utils';
import styles from './Times.styles';

const Times = ({ times, hoursInDisplay, timeStep, textStyle }) => {
  const height = getTimeLabelHeight(hoursInDisplay, timeStep);
  return (
    <View style={styles.columnContainer}>
      {times.map((time, index) => (
        <View key={`${time} ${index}`} style={[styles.label, { height }]}>
          <Text style={[styles.text, textStyle]}>{time}</Text>
        </View>
      ))}
    </View>
  );
};

Times.propTypes = {
  times: PropTypes.arrayOf(PropTypes.string).isRequired,
  hoursInDisplay: PropTypes.number.isRequired,
  timeStep: PropTypes.number.isRequired,
  textStyle: Text.propTypes.style,
};

export default React.memo(Times);
