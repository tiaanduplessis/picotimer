'use strict'

const EventEmitter = require('events')

const { hrtime } = process

const NANOSECONDS_PER_MILLISECOND = 1e6
const MILLISECONDS_PER_SECOND = 1000

/**
 *
 * Create an new Timer instance for a given amount of milliseconds
 * Emits a "tick" event at provided interval and "finished" event once time has passed
 *
 */
class Timer extends EventEmitter {
  constructor (milliseconds = 1000, options = { interval: 1000 }) {
    super()

    if (!(this instanceof Timer)) {
      return new Timer(milliseconds, options)
    }

    if (typeof milliseconds !== 'number' || milliseconds < 0) {
      throw new Error('milliseconds should be a positive number')
    }

    this.remaining = milliseconds
    this.interval = options.interval
    this.hasStarted = false
  }

  /**
   * Determine if timer has finished
   */
  get hasFinished () {
    return this.remaining <= 0
  }

  /**
 * Start a new timer if it hasn't already been started
 */
  start () {
    if (this.hasStarted || this.hasFinished) {
      return false
    }

    this.startTime = hrtime()
    this._remainingAtStart = this.remaining
    this.hasStarted = true
    this.passed = 0
    this._timeout(Math.min(this.interval, this.remaining))

    return true
  }

  _timeout (interval) {
    this.timeout = setTimeout(() => {
      const passed = this._calculateTimeDiff(0)
      this.remaining = Math.max(0, this._remainingAtStart - passed)
      this.passed = passed

      if (this.hasFinished) {
        this.stop()
        this.emit('finished')
      } else {
        // Skip missed ticks, keeping the configured interval and its original cadence.
        const nextInterval = this.interval - passed % this.interval
        this._timeout(Math.min(nextInterval, this.remaining))
        this.emit('tick', this.remaining)
      }
    }, interval)
  }

  _calculateTimeDiff (passed) {
    const [seconds, nanoSeconds] = hrtime(this.startTime)
    return seconds * MILLISECONDS_PER_SECOND + nanoSeconds / NANOSECONDS_PER_MILLISECOND - passed
  }

  stop () {
    if (!this.hasStarted) {
      return
    }

    clearTimeout(this.timeout)
    this.timeout = null
    this.hasStarted = false
  }
}

module.exports = Timer
