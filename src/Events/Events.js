import {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH,
  CONTENT_OFFSET,
  DATE_STR_FORMAT,
  availableNumberOfDays,
  calculateDaysArray,
  getPosLabelOfTime,
  getTimeLabelHeight,
  minutesToYDimension,
} from '../utils';
import React, { PureComponent } from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import Event from '../Event/Event';
import NowLine from '../NowLine/NowLine';
import PropTypes from 'prop-types';
import memoizeOne from 'memoize-one';
import moment from 'moment';
import styles from './Events.styles';

const MINUTES_IN_HOUR = 60;
const EVENT_HORIZONTAL_PADDING = 15;
const EVENTS_CONTAINER_WIDTH = CONTAINER_WIDTH - EVENT_HORIZONTAL_PADDING;
const MIN_ITEM_WIDTH = 4;
const ALLOW_OVERLAP_SECONDS = 2;

const areEventsOverlapped = (event1EndDate, event2StartDate) => {
  const endDate = moment(event1EndDate);
  endDate.subtract(ALLOW_OVERLAP_SECONDS, 'seconds');
  return endDate.isSameOrAfter(event2StartDate);
};

class Events extends PureComponent {
  getStyleForEvent = (item) => {
    const { hoursInDisplay } = this.props;

    const startDate = moment(item.startDate);
    const startHours = startDate.hours();
    const startMinutes = startDate.minutes();
    const totalStartMinutes = startHours * MINUTES_IN_HOUR + startMinutes;
    const top = minutesToYDimension(hoursInDisplay, totalStartMinutes);
    const deltaMinutes = moment(item.endDate).diff(item.startDate, 'minutes');
    const height = minutesToYDimension(hoursInDisplay, deltaMinutes);
    const width = this.getEventItemWidth();

    return {
      top: top + CONTENT_OFFSET,
      left: 0,
      height,
      width,
    };
  };

  addOverlappedToArray = (baseArr, overlappedArr, itemWidth) => {
    // Given an array of overlapped events (with style), modifies their style to overlap them
    // and adds them to a (base) array of events.
    if (!overlappedArr) return;

    const nOverlapped = overlappedArr.length;
    if (nOverlapped === 0) {
      return;
    }
    if (nOverlapped === 1) {
      baseArr.push(overlappedArr[0]);
      return;
    }

    let nLanes;
    let horizontalPadding;
    let indexToLane;
    if (nOverlapped === 2) {
      nLanes = nOverlapped;
      horizontalPadding = 3;
      indexToLane = (index) => index;
    } else {
      // Distribute events in multiple lanes
      const maxLanes = nOverlapped;
      const latestByLane = {};
      const laneByEvent = {};
      overlappedArr.forEach((event, index) => {
        for (let lane = 0; lane < maxLanes; lane += 1) {
          const lastEvtInLaneIndex = latestByLane[lane];
          const lastEvtInLane =
            (lastEvtInLaneIndex || lastEvtInLaneIndex === 0) &&
            overlappedArr[lastEvtInLaneIndex];
          if (
            !lastEvtInLane ||
            !areEventsOverlapped(
              lastEvtInLane.data.endDate,
              event.data.startDate,
            )
          ) {
            // Place in this lane
            latestByLane[lane] = index;
            laneByEvent[index] = lane;
            break;
          }
        }
      });

      nLanes = Object.keys(latestByLane).length;
      horizontalPadding = 2;
      indexToLane = (index) => laneByEvent[index];
    }
    const dividedWidth = itemWidth / nLanes;
    const width = Math.max(dividedWidth - horizontalPadding, MIN_ITEM_WIDTH);

    overlappedArr.forEach((eventWithStyle, index) => {
      const { data, style } = eventWithStyle;
      baseArr.push({
        data,
        style: {
          ...style,
          width,
          left: dividedWidth * indexToLane(index),
        },
      });
    });
  };

  getEventsWithPosition = (totalEvents) => {
    const regularItemWidth = this.getEventItemWidth();

    return totalEvents.map((events) => {
      let overlappedSoFar = []; // Store events overlapped until now
      let lastDate = null;
      const eventsWithStyle = events.reduce((eventsAcc, event) => {
        const style = this.getStyleForEvent(event);
        const eventWithStyle = {
          data: event,
          style,
        };

        if (!lastDate || areEventsOverlapped(lastDate, event.startDate)) {
          overlappedSoFar.push(eventWithStyle);
          const endDate = moment(event.endDate);
          lastDate = lastDate ? moment.max(endDate, lastDate) : endDate;
        } else {
          this.addOverlappedToArray(
            eventsAcc,
            overlappedSoFar,
            regularItemWidth,
          );
          overlappedSoFar = [eventWithStyle];
          lastDate = moment(event.endDate);
        }
        return eventsAcc;
      }, []);
      this.addOverlappedToArray(
        eventsWithStyle,
        overlappedSoFar,
        regularItemWidth,
      );
      return eventsWithStyle;
    });
  };

  yToHour = (y) => {
    const { hoursInDisplay } = this.props;
    const hour = (y * hoursInDisplay) / CONTAINER_HEIGHT;
    return hour;
  };

  getEventItemWidth = (padded = true) => {
    const { numberOfDays } = this.props;
    const fullWidth = padded ? EVENTS_CONTAINER_WIDTH : CONTAINER_WIDTH;
    return fullWidth / numberOfDays;
  };

  processEvents = memoizeOne(
    (eventsByDate, initialDate, numberOfDays, rightToLeft) => {
      // totalEvents stores events in each day of numberOfDays
      // example: [[event1, event2], [event3, event4], [event5]], each child array
      // is events for specific day in range
      const dates = calculateDaysArray(initialDate, numberOfDays, rightToLeft);
      const totalEvents = dates.map((date) => {
        const dateStr = date.format(DATE_STR_FORMAT);
        return eventsByDate[dateStr] || [];
      });
      const totalEventsWithPosition = this.getEventsWithPosition(totalEvents);
      return totalEventsWithPosition;
    },
  );

  state = {
    selectedTime: null,
  }

  onGridClick = (event, dayIndex) => {
    const { initialDate, onGridClick, totalLinesPerHour } = this.props;
    if (!onGridClick) {
      return;
    }
    const { locationY } = event.nativeEvent;
    const totalGridLinesPerHour = totalLinesPerHour > 0 ? totalLinesPerHour - 1 : 5
    // const hour = Math.floor(this.yToHour(locationY - CONTENT_OFFSET));
    const time = this.roundTime(this.yToHour(locationY - CONTENT_OFFSET), 60 / totalGridLinesPerHour)

    const date = moment(initialDate).add(dayIndex, 'day').toDate();
    this.setState({
      selectedTime: {
        start: time,
        end: {
          minutes: time.minutes + 60 / totalGridLinesPerHour,
          hour: Math.floor(time.hour + 1 / totalGridLinesPerHour),
        }
      }
    })

    onGridClick(event, time, date);
  };

  roundTime = (hour, minutesToRound) => {
    const roundedHour = Math.floor(hour);
    const dateTime = new Date();
    dateTime.setHours(roundedHour)
    dateTime.setMinutes((hour - roundedHour) * 60)
    let coeff = 1000 * 60 * minutesToRound;
    const result = new Date(Math.floor(dateTime.getTime() / coeff) * coeff);

    return {
      hour: result.getHours(),
      minutes: result.getMinutes(),
    };
  }

  isToday = (dayIndex) => {
    const { initialDate } = this.props;
    const today = moment();
    return moment(initialDate).add(dayIndex, 'days').isSame(today, 'day');
  };

  render() {
    const {
      eventsByDate,
      initialDate,
      numberOfDays,
      times,
      onEventPress,
      eventContainerStyle,
      EventComponent,
      rightToLeft,
      hoursInDisplay,
      timeStep,
      showNowLine,
      nowLineColor,
      totalLinesPerHour,
      selectedTimeStyle,
    } = this.props;
    const totalEvents = this.processEvents(
      eventsByDate,
      initialDate,
      numberOfDays,
      rightToLeft,
    );

      // console.log('Events')
    return (
      <View style={styles.container}>
        <GridLineList
          times={times}
          totalLinesPerHour={totalLinesPerHour}
          timeStep={timeStep}
          hoursInDisplay={hoursInDisplay}
          selectedTime={this.state.selectedTime}
          selectedTimeStyle={selectedTimeStyle}
        />
        <View style={styles.events}>
          {totalEvents.map((eventsInSection, dayIndex) => (
            <TouchableWithoutFeedback
              onPress={(e) => this.onGridClick(e, dayIndex)}
              key={dayIndex}
            >
              <View style={styles.event}>
                {showNowLine && this.isToday(dayIndex) && (
                  <NowLine
                    color={nowLineColor}
                    hoursInDisplay={hoursInDisplay}
                    width={this.getEventItemWidth(false)}
                  />
                )}
                {eventsInSection.map((item) => (
                  <Event
                    key={item.data.id}
                    event={item.data}
                    position={item.style}
                    onPress={onEventPress}
                    EventComponent={EventComponent}
                    containerStyle={eventContainerStyle}
                  />
                ))}
              </View>
            </TouchableWithoutFeedback>
          ))}
        </View>
      </View>
    );
  }
}

class GridLineList extends React.PureComponent {
  isHighlighted = (hour, lineIndex) => {
    return hour + lineIndex / (this.props.totalLinesPerHour - 1) === this.props.selectedTime?.start?.hour + this.props.selectedTime?.start?.minutes / 60;
  }

  render() {
    const { times, hoursInDisplay, timeStep, totalLinesPerHour, selectedTime, selectedTimeStyle } = this.props
    const totalGridLinesPerHour = totalLinesPerHour ?? 5
    const listLines = Array.from(Array(totalGridLinesPerHour).keys())

    return (
      <>
        {times.map(({ value, label }) => {
          const height = getTimeLabelHeight(hoursInDisplay, timeStep)
          
          return (
            <View
              key={value}
              style={[
                styles.timeRow,
                { height, justifyContent: 'space-between' },
              ]}
            >
              {listLines.map(
                (line, index) => (
                  <GridLineListItem
                    key={line}
                    isTheLast={index === totalGridLinesPerHour - 1}
                    isActive={this.isHighlighted(value, index)}
                    selectedTime={selectedTime}
                    selectedTimeStyle={selectedTimeStyle}
                  />
                ),
              )}
            </View>
          )
        })}
      </>
    )
  }
}

class GridLineListItem extends React.Component {
  /**
   * 
   * @param {object} input seconds 
   */
  toHHMM = ({ input, isHasTimeLabel, isShowTimeLabel }) => {
    let sec_num = input; // don't forget the second param
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);

    let hoursStr = "";
    if (hours >= 10) {
      if (isHasTimeLabel) {
        let nowHours = hours > 12 ? hours - 12 : hours;
        hoursStr += nowHours;
      } else {
        hoursStr += hours;
      }
    } else {
      hoursStr = "0" + hours;
    }

    let minutesStr = "";
    if (minutes < 10) {
      minutesStr = `0${minutes}`
    } else {
      minutesStr = `${minutes}`
    }
   
    return `${hoursStr}:${minutesStr}${isHasTimeLabel && isShowTimeLabel ? ` ${getPosLabelOfTime(hours)}` : ''}`;
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.isActive !== this.props.isActive
  }

  render() {
    const { isTheLast, isActive, selectedTime, selectedTimeStyle } = this.props
    let startSeconds = 0, endSeconds = 0;
    if (selectedTime) {
      const { start, end } = selectedTime
      startSeconds = start ? start.hour * 3600 + start.minutes * 60 : 0
      endSeconds = end ? end.hour * 3600 + end.minutes * 60 : 0
    }
    const startTime = this.toHHMM({ input: startSeconds, isHasTimeLabel: true, isShowTimeLabel: false })
    const endTime = this.toHHMM({ input: endSeconds, isHasTimeLabel: true, isShowTimeLabel: true })
    
    return (
      <View
        style={
          isTheLast === false
            ? [styles.timeLabelLine, {
              backgroundColor: isActive ? (selectedTimeStyle.backgroundColor ?? 'red') : 'white'
            }]
            : {}
        }
      >
        {isActive && (
          <Text style={{
            color: isActive ? (selectedTimeStyle.color ?? 'white') : 'black',
            fontFamily: selectedTimeStyle.fontFamily,
          }}>{startTime} - {endTime}</Text>
        )}
      </View>
    )
  }
}

Events.propTypes = {
  numberOfDays: PropTypes.oneOf(availableNumberOfDays).isRequired,
  eventsByDate: PropTypes.objectOf(PropTypes.arrayOf(Event.propTypes.event))
    .isRequired,
  initialDate: PropTypes.string.isRequired,
  hoursInDisplay: PropTypes.number.isRequired,
  timeStep: PropTypes.number.isRequired,
  times: PropTypes.arrayOf(PropTypes.object).isRequired,
  onEventPress: PropTypes.func,
  onGridClick: PropTypes.func,
  eventContainerStyle: PropTypes.object,
  EventComponent: PropTypes.elementType,
  rightToLeft: PropTypes.bool,
  showNowLine: PropTypes.bool,
  nowLineColor: PropTypes.string,
};

export default Events;
