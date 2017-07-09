const Timer = require('./')

const TIME = 2000

test('should create new instance', () => {
  expect(Timer).toBeDefined()
  expect(new Timer(TIME)).toBeInstanceOf(Timer)
})

test('should call tick function', done => {
  const fn = jest.fn()

  const timer = new Timer(TIME)
  timer.start()

  timer.on('tick', fn)

  timer.on('finished', () => {
    expect(fn).toBeCalled()
    done()
  })
})

test('should give remaining time', done => {
  const timer = new Timer(TIME)
  timer.start()

  timer.on('tick', remaining => {
    expect(typeof remaining).toBe('number')
  })

  timer.on('finished', done)
})
