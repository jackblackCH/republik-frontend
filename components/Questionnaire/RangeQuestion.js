import React, { Component } from 'react'
import { compose, withApollo } from 'react-apollo'
import { css, merge } from 'glamor'
import debounce from 'lodash.debounce'

import {
  colors,
  Interaction
} from '@project-r/styleguide'

import { questionStyles } from './questionStyles'
const { H2 } = Interaction

const thumbSize = 24

const thumbStyle = {
  borderWidth: 0,
  borderRadius: '50%',
  width: thumbSize,
  height: thumbSize,
  background: colors.primary,
  outline: 'none'
}

const trackStyle = {
  background: colors.secondaryBg,
  height: 5
}

const styles = {
  sliderWrapper: css({
    minHeight: 30,
    maxHeight: 50
  }),
  slider: css({
    WebkitAppearance: 'none',
    width: '100%',
    background: 'transparent',
    outline: 'none',
    ':focus': {
      outline: 'none'
    },
    // thumb
    '::-webkit-slider-thumb': {
      ...thumbStyle,
      WebkitAppearance: 'none',
      marginTop: -9
    },
    '::-moz-range-thumb': {
      ...thumbStyle
    },
    '::-ms-thumb': {
      ...thumbStyle
    },
    // track
    '::-webkit-slider-runnable-track': {
      ...trackStyle,
      width: '100%'
    },
    '::-moz-range-track': {
      ...trackStyle,
      width: '100%'
    },
    '::-ms-track': {
      width: '100%',
      borderColor: 'transparent',
      color: 'transparent',
      background: 'transparent',
      height: thumbSize
    },
    '::-ms-fill-lower': {
      ...trackStyle
    },
    '::-ms-fill-upper': {
      ...trackStyle
    }
  }),
  sliderEmpty: css({
    '::-webkit-slider-thumb': {
      background: colors.disabled
    },
    '::-moz-range-thumb': {
      background: colors.disabled
    },
    '::-ms-thumb': {
      background: colors.disabled
    }
  }),
  ticks: css({
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    textAlign: 'center',
    paddingLeft: 0,
    '& div:first-child': {
      textAlign: 'left',
      paddingRight: 5
    },
    '& div:last-child': {
      textAlign: 'right',
      paddingLeft: 5
    }
  })
}

const sliderDefault = merge(styles.slider, styles.sliderEmpty)

class RangeQuestion extends Component {
  constructor (props) {
    super(props)
    this.state = {
      ...this.deriveStateFromProps(props)
    }
  }

  deriveStateFromProps (props) {
    return props.question.userAnswer ? props.question.userAnswer.payload : { value: null }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.question.userAnswer !== this.props.question.userAnswer) {
      this.setState(this.deriveStateFromProps(nextProps))
    }
  }

  renderInput = () => {
    const { question: { ticks, kind } } = this.props
    const { value } = this.state
    const tickValues = ticks.map(t => t.value)
    const max = Math.max(...tickValues)
    const min = Math.min(...tickValues)

    const step = kind === 'continous'
      ? ticks.length / 100
      : Math.abs(max - min) /
          (ticks.length % 2 === 0 ? ticks.length : ticks.length + 1)

    const defaultValue = (min < 0 || max < 0) && !(min < 0 && max < 0)
      ? 0
      : Math.abs(min - max) / 2

    return (
      <div {...styles.sliderWrapper}>
        <input
          {...(value === null ? sliderDefault : styles.slider)}
          type='range'
          min={min}
          max={max}
          step={step}
          value={value === null ? defaultValue : value}
          onChange={this.handleChange}
        />
      </div>
    )
  }

  renderLabels = () => {
    const { question: { ticks } } = this.props
    return (
      <div {...styles.ticks}>
        {
          ticks.map(t =>
            <div key={t.label} style={{ width: `${100 / (ticks.length)}%` }}>{t.label}</div>
          )
        }
      </div>
    )
  }

  onChangeDebounced = debounce(this.props.onChange, 500)

  handleChange = (ev) => {
    const value = +ev.target.value
    this.setState({ value })
    this.onChangeDebounced(value)
  }

  render () {
    const { question: { text } } = this.props
    return (
      <div>
        { text &&
          <H2 {...questionStyles.label}>{text}</H2>
        }
        <div {...questionStyles.body}>
          {
            this.renderInput()
          }
          {
            this.renderLabels()
          }
        </div>
      </div>
    )
  }
}

export default compose(
  withApollo
)(RangeQuestion)
