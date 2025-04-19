'use strict'

const Redis = require('ioredis')
if (process.env.REDISCLOUD_URL === undefined) {
  // throw new Error('process.env.REDISCLOUD_URL is undefined')
  // process.env.REDISCLOUD_URL =  `redis://default:930240324i0923i@207.148.23.43:6379`
  process.env.REDISCLOUD_URL = 'redis://127.0.0.1:6379'
}

// const os = require('os'); console.log(os.hostname());

let redisClient
// DEBUG=ioredis:* node app.js
module.exports = () => {
  if (redisClient === undefined || redisClient.connected === false) {
    redisClient = new Redis(process.env.REDISCLOUD_URL, {
      retryStrategy: retryStrategy
    })
    // redisClient = new Redis( process.env.REDISCLOUD_URL,  { retryStrategy: retryStrategy })

    redisClient.on('reconnecting', time => {
      console.log(
        `Attempt will delay ${time}ms to reconnect to  ${process.env.REDISCLOUD_URL}`
      )
    })

    redisClient.on('connect', function () {
      console.log(`connected to ${process.env.REDISCLOUD_URL}`)
    })

    redisClient.on('ready', function () {
      console.log(`${process.env.REDISCLOUD_URL} is ready`)
    })

    redisClient.on('error', function (err) {
      console.log(`redis error ${err}`)
    })
  }

  return redisClient
}

const retryStrategy = times => {
  console.log(`Attempt ${times} to reconnect to ${process.env.REDISCLOUD_URL}`)

  // reconnect after every second
  return 3000
}

const cleanup = signal => {
  return () => {
    console.log(`cleanup fired on signal ${signal}`)
    redisClient.quit()

    process.exit(signal)
  }
}

process.on('SIGINT', cleanup(2))
process.on('SIGTERM', cleanup(15))
