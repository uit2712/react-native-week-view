import { Animated, PanResponder, Text, TouchableOpacity } from 'react-native';

import PropTypes from 'prop-types';
import React from 'react';
import styles from './Event.styles';

const UPDATE_EVENT_ANIMATION_DURATION = 150;

const hasMovedEnough = (gestureState) => {
  const { dx, dy } = gestureState;
  return Math.abs(dx) > 2 || Math.abs(dy) > 2;
};

class Event extends React.Component {
  translatedByDrag = new Animated.ValueXY();

  panResponder = PanResponder.create({
    // If the press is disabled, the drag-gesture will be handled in the capture phase
    // If the press is enabled, will be handled in the bubbling phase
    onStartShouldSetPanResponder: () => this.isDragEnabled(),
    onStartShouldSetPanResponderCapture: () =>
      this.isPressDisabled() && this.isDragEnabled(),
    onMoveShouldSetPanResponder: (_, gestureState) =>
      this.isDragEnabled() && hasMovedEnough(gestureState),
    onMoveShouldSetPanResponderCapture: (_, gestureState) =>
      this.isPressDisabled() &&
      this.isDragEnabled() &&
      hasMovedEnough(gestureState),
    onPanResponderMove: Animated.event(
      [
        null,
        {
          dx: this.translatedByDrag.x,
          dy: this.translatedByDrag.y,
        },
      ],
      {
        useNativeDriver: false,
      },
    ),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      const { dx, dy } = gestureState;
      this.onDragRelease(dx, dy);
    },
    onPanResponderTerminate: () => {
      this.translatedByDrag.setValue({ x: 0, y: 0 });
    },
  });

  constructor(props) {
    super(props);

    const { left, width } = props.position;
    this.currentWidth = new Animated.Value(width);
    this.currentLeft = new Animated.Value(left);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.position !== this.props.position) {
      this.translatedByDrag.setValue({ x: 0, y: 0 });
      const animations = [];
      const { left, width } = this.props.position;
      if (prevProps.position.width !== width) {
        animations.push(
          Animated.timing(this.currentWidth, {
            toValue: width,
            duration: UPDATE_EVENT_ANIMATION_DURATION,
            useNativeDriver: false,
          }),
        );
      }
      if (prevProps.position.left !== left) {
        animations.push(
          Animated.timing(this.currentLeft, {
            toValue: left,
            duration: UPDATE_EVENT_ANIMATION_DURATION,
            useNativeDriver: false,
          }),
        );
      }
      Animated.parallel(animations).start();
    }
  }

  isPressDisabled = () => {
    return !this.props.onPress;
  };

  isDragEnabled = () => {
    return !!this.props.onDrag;
  };

  onDragRelease = (dx, dy) => {
    const { position, onDrag } = this.props;
    if (!onDrag) {
      return;
    }

    const newX = position.left + position.width / 2 + dx;
    const newY = position.top + dy;
    onDrag(this.props.event, newX, newY);
  };

  render() {
    const {
      event,
      onPress,
      position,
      EventComponent,
      containerStyle,
    } = this.props;

    const { top, height } = position;
    return (
      <Animated.View
        style={[
          styles.container,
          {
            top,
            left: this.currentLeft,
            height,
            width: this.currentWidth,
            backgroundColor: event.color,
          },
          this.translatedByDrag.getTranslateTransform(),
          containerStyle,
        ]}
        /* eslint-disable react/jsx-props-no-spreading */
        {...this.panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.touchableContainer}
          disabled={!onPress}
          onPress={() => onPress && onPress(event)}
        >
          {EventComponent ? (
            <EventComponent event={event} position={position} />
          ) : (
            <Text style={styles.description}>{event.description}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

const eventPropType = PropTypes.shape({
  color: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string,
  startDate: PropTypes.instanceOf(Date).isRequired,
  endDate: PropTypes.instanceOf(Date).isRequired,
});

const positionPropType = PropTypes.shape({
  height: PropTypes.number,
  width: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
});

Event.propTypes = {
  event: eventPropType.isRequired,
  position: positionPropType.isRequired,
  onPress: PropTypes.func,
  containerStyle: PropTypes.object,
  EventComponent: PropTypes.elementType,
  onDrag: PropTypes.func,
};

export default Event;
