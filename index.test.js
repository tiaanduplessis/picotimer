const EventEmitter = require('events')
const fs = require('fs')
const vm = require('vm')

// Keep the clock and callbacks under test control; no test waits for a real timer.
const source = fs.readFileSync(process.env.PICOTIMER_ENTRY || require.resolve('./'), 'utf8')

function createClock () {
  let now = 0
  let nextId = 0
  const jobs = new Map()
  const delays = []
  const module = { exports: {} }

  vm.runInNewContext(source, {
    module,
    require,
    process: {
      hrtime (start) {
        const nanoseconds = Math.round(now * 1e6) - (start ? start[0] * 1e9 + start[1] : 0)
        return [Math.floor(nanoseconds / 1e9), nanoseconds % 1e9]
      }
    },
    setTimeout (callback, delay) {
      const id = ++nextId
      delays.push(delay)
      jobs.set(id, { callback, at: now + Math.max(1, delay) })
      return id
    },
    clearTimeout (id) {
      jobs.delete(id)
    }
  }, { filename: 'picotimer/index.js' })

  return {
    Timer: module.exports,
    jobs,
    delays,
    advance (milliseconds) { now += milliseconds },
    next (actualTime) {
      const entry = Array.from(jobs.entries()).sort((a, b) => a[1].at - b[1].at)[0]
      if (!entry) throw new Error('No callback is pending')
      const [id, job] = entry
      jobs.delete(id)
      now = actualTime === undefined ? Math.max(now, job.at) : actualTime
      job.callback()
    }
  }
}

function observe (timer) {
  const events = []
  timer.on('tick', remaining => events.push(['tick', remaining]))
  timer.on('finished', () => events.push(['finished']))
  return events
}

test('exports an EventEmitter constructor with the existing defaults', () => {
  const { Timer } = createClock()
  const timer = new Timer()
  expect(timer).toBeInstanceOf(Timer)
  expect(timer).toBeInstanceOf(EventEmitter)
  expect(timer.remaining).toBe(1000)
  expect(timer.interval).toBe(1000)
  expect(timer.hasStarted).toBe(false)
  expect(timer.hasFinished).toBe(false)
})

test('ticks with remaining time and finishes once on the ordinary cadence', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  expect(timer.start()).toBe(true)
  expect(timer.start()).toBe(false)
  expect(clock.jobs.size).toBe(1)
  clock.next()
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 2000], ['tick', 1000], ['finished']])
  expect(timer.remaining).toBe(0)
  expect(timer.interval).toBe(1000)
  expect(timer.hasFinished).toBe(true)
  expect(timer.hasStarted).toBe(false)
  expect(timer.timeout).toBe(null)
  expect(timer.start()).toBe(false)
  expect(clock.jobs.size).toBe(0)
})

test('finishes immediately when the first callback is delayed past the duration', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.start()
  clock.next(3500)
  expect(events).toEqual([['finished']])
  expect(timer.remaining).toBe(0)
  expect(timer.hasStarted).toBe(false)
  expect(timer.interval).toBe(1000)
  expect(clock.delays).toEqual([1000])
  expect(clock.jobs.size).toBe(0)
})

test('skips overdue ticks without negative waits or increasing remaining time', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.start()
  clock.next(2500)
  expect(timer.remaining).toBe(500)
  expect(timer.interval).toBe(1000)
  expect(clock.delays).toEqual([1000, 500])
  clock.next()
  expect(events).toEqual([['tick', 500], ['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('compensates small callback delays without changing the configured interval', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.start()
  clock.next(1005)
  clock.next(2010)
  clock.next(3000)
  expect(events).toEqual([['tick', 1995], ['tick', 990], ['finished']])
  expect(clock.delays).toEqual([1000, 995, 990])
  expect(timer.interval).toBe(1000)
  expect(clock.jobs.size).toBe(0)
})

test('keeps the original cadence after missing several whole intervals', () => {
  const clock = createClock()
  const timer = new clock.Timer(5000)
  const events = observe(timer)
  timer.start()
  clock.next(3500)
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 1500], ['tick', 1000], ['finished']])
  expect(clock.delays).toEqual([1000, 500, 1000])
  expect(clock.jobs.size).toBe(0)
})

test('finishes at the exact deadline after fractional callback delays', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.start()
  clock.next(1000.1)
  clock.next(2000.2)
  clock.next(3000)
  expect(events).toEqual([['tick', 1999.9], ['tick', 999.8], ['finished']])
  expect(timer.remaining).toBe(0)
  expect(clock.delays.length).toBe(3)
  expect(clock.jobs.size).toBe(0)
})

test('accounts for time spent inside tick listeners on the next callback', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.once('tick', () => clock.advance(2500))
  timer.start()
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 2000], ['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('supports fractional durations and custom intervals', () => {
  const clock = createClock()
  const timer = new clock.Timer(750.25, { interval: 250.5 })
  const events = observe(timer)
  timer.start()
  clock.next()
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 499.75], ['tick', 249.25], ['finished']])
  expect(clock.delays).toEqual([250.5, 250.5, 249.25])
  expect(timer.interval).toBe(250.5)
  expect(clock.jobs.size).toBe(0)
})

test('caps the first wait at the remaining duration', () => {
  const clock = createClock()
  const timer = new clock.Timer(250)
  const events = observe(timer)
  timer.start()
  expect(clock.delays).toEqual([250])
  clock.next()
  expect(events).toEqual([['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('handles early fractional callbacks without finishing before the deadline', () => {
  const clock = createClock()
  const timer = new clock.Timer(2.5, { interval: 1.5 })
  const events = observe(timer)
  timer.start()
  clock.next(1)
  clock.next(2)
  clock.next(3)
  expect(events).toEqual([['tick', 1.5], ['tick', 0.5], ['finished']])
  expect(clock.delays).toEqual([1.5, 0.5, 0.5])
  expect(clock.jobs.size).toBe(0)
})

test('stopping before a tick preserves the existing remaining-time snapshot', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  expect(timer.stop()).toBe(undefined)
  timer.start()
  clock.advance(400)
  expect(timer.stop()).toBe(undefined)
  expect(timer.stop()).toBe(undefined)
  expect(timer.remaining).toBe(3000)
  expect(timer.hasStarted).toBe(false)
  expect(clock.jobs.size).toBe(0)
  clock.advance(10000)
  expect(timer.start()).toBe(true)
  clock.next()
  expect(events).toEqual([['tick', 2000]])
  timer.stop()
  expect(clock.jobs.size).toBe(0)
})

test('resumes after delayed ticks without counting paused time or reusing drift', () => {
  const clock = createClock()
  const timer = new clock.Timer(4000)
  const events = observe(timer)
  timer.start()
  clock.next(1500)
  timer.stop()
  expect(timer.remaining).toBe(2500)
  clock.advance(10000)
  expect(timer.start()).toBe(true)
  expect(timer.start()).toBe(false)
  clock.next()
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 2500], ['tick', 1500], ['tick', 500], ['finished']])
  expect(clock.delays).toEqual([1000, 500, 1000, 1000, 500])
  expect(clock.jobs.size).toBe(0)
})

test('repeated stop/start cycles keep exactly one pending timeout', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  for (let i = 0; i < 5; i++) {
    expect(timer.start()).toBe(true)
    expect(timer.start()).toBe(false)
    expect(clock.jobs.size).toBe(1)
    timer.stop()
    timer.stop()
    expect(clock.jobs.size).toBe(0)
  }
  timer.start()
  clock.next()
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 2000], ['tick', 1000], ['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('lets a tick listener stop the already-scheduled next callback', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.on('tick', () => {
    expect(timer.hasStarted).toBe(true)
    expect(timer.hasFinished).toBe(false)
    expect(clock.jobs.size).toBe(1)
    timer.stop()
  })
  timer.start()
  clock.next()
  expect(events).toEqual([['tick', 2000]])
  expect(timer.hasStarted).toBe(false)
  expect(clock.jobs.size).toBe(0)
})

test('lets a tick listener stop and resume without duplicate callbacks', () => {
  const clock = createClock()
  const timer = new clock.Timer(3000)
  const events = observe(timer)
  timer.once('tick', () => {
    timer.stop()
    expect(timer.start()).toBe(true)
    expect(timer.start()).toBe(false)
  })
  timer.start()
  clock.next()
  expect(clock.jobs.size).toBe(1)
  clock.next()
  clock.next()
  expect(events).toEqual([['tick', 2000], ['tick', 1000], ['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('settles state before emitting finished, including reentrant calls', () => {
  const clock = createClock()
  const timer = new clock.Timer(1000)
  const events = observe(timer)
  timer.on('finished', () => {
    expect(timer.remaining).toBe(0)
    expect(timer.hasFinished).toBe(true)
    expect(timer.hasStarted).toBe(false)
    expect(timer.timeout).toBe(null)
    expect(clock.jobs.size).toBe(0)
    expect(timer.start()).toBe(false)
    expect(timer.stop()).toBe(undefined)
  })
  timer.start()
  clock.next()
  expect(events).toEqual([['finished']])
  expect(clock.jobs.size).toBe(0)
})

test('retains zero-duration behavior without scheduling or emitting', () => {
  const clock = createClock()
  const timer = new clock.Timer(0)
  const events = observe(timer)
  expect(timer.hasFinished).toBe(true)
  expect(timer.start()).toBe(false)
  expect(timer.stop()).toBe(undefined)
  expect(events).toEqual([])
  expect(clock.jobs.size).toBe(0)
})

test('retains the existing duration validation', () => {
  const { Timer } = createClock()
  ;[-1, -0.5, '1000', null, true, {}, []].forEach(value => {
    expect(() => new Timer(value)).toThrow('milliseconds should be a positive number')
  })
  // Input validation is unchanged; non-finite values were not rejected previously.
  expect(() => new Timer(NaN)).not.toThrow()
  expect(() => new Timer(Infinity)).not.toThrow()
})
