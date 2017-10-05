
<h1 align="center">picotimer</h1>
<div align="center">
  <strong>Tiny event based timer</strong>
</div>
<div align="center">
  <a href="https://npmjs.org/package/picotimer">
    <img src="https://img.shields.io/npm/v/picotimer.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/picotimer">
  <img src="https://img.shields.io/npm/dm/picotimer.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/picotimer">
    <img src="https://img.shields.io/travis/tiaanduplessis/picotimer.svg?style=flat-square" alt="travis ci build status" />
  </a>
  <a href="https://github.com/tiaanduplessis/picotimer/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/picotimer.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/picotimer/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/picotimer.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/picotimer/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/picotimer.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20picotimer!%20https://github.com/tiaanduplessis/picotimer%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/picotimer.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/picotimer/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#about">About</a></li>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>

## About

[![Greenkeeper badge](https://badges.greenkeeper.io/tiaanduplessis/picotimer.svg)](https://greenkeeper.io/)

A tiny timer that emits a "tick" event at given interval(defaults to 1 second) showing the actual time passed. Emits a "finished" event once done.

## Install

```sh
$ npm install picotimer
# OR
$ yarn add picotimer
```

## Usage

```js
const Timer = require('picotimer')

const timer = new Timer(10000) // 10 Second timer
const otherTimer = new Timer(5000, { interval: 500 }) // 5 Second timer that will emit "tick" event every half second

timer.on('tick', remaining => {
  console.log(remaining)
  console.log(timer.hasFinished, timer.hasStarted)

  if (remaining < 3000) {
    timer.stop() // Stop it prior to finishing
    otherTimer.start()
  }
})

otherTimer.on('tick', console.log)
otherTimer.on('finished', () => {
  console.log(`That's all folks!`)
})

timer.start()

// 9000
// false true
// 8002.929022
// false true
// 7010.797439
// false true
// 6026.31589
// false true
// 5052.967289
// false true
// 4095.9625599999995
// false true
// 3158.4987889999984
// false true
// 2242.239962999997
// false true
// 4500
// 4004.104806
// 3516.2985419999995
// 3041.2491829999994
// 2582.125558999999
// 2144.1727109999993
// 1731.8530529999996
// 1347.7554280000008
// 993.3701170000043
// 671.8532830000131
// 386.8910150000363
// 142.10573800009797
```

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/picotimer/issues).

## License

Licensed under the MIT License.
