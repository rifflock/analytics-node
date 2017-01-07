'use strict'

const debug = require('debug')('analytics-node')
const { version } = require('./package.json')
const request = require('superagent')
const { extend } = require('lodash')
const uid = require('crypto-token')
const assert = require('assert')

class Analytics {
  constructor (writeKey, options = {}) {
    debug('Analytics(%s, %j)', writeKey, options)
    assert(writeKey, 'You must pass a write key.')

    this.host = options.host || 'https://api.segment.com'
    this.flushAt = Math.max(options.flushAt, 1) || 20
    this.flushAfter = options.flushAfter || 10000
    this.writeKey = writeKey
    this.queue = []
  }

  identify (message, fn) {
    debug('identify(%j)', message)
    validate(message)
    assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".')
    message.type = 'identify'
    this.enqueue(message, fn)
    return this
  }

  group (message, fn) {
    debug('group(%j)', message)
    validate(message)
    assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".')
    assert(message.groupId, 'You must pass a "groupId".')
    message.type = 'group'
    this.enqueue(message, fn)
    return this
  }

  track (message, fn) {
    debug('track(%j)', message)
    validate(message)
    assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".')
    assert(message.event, 'You must pass an "event".')
    message.type = 'track'
    this.enqueue(message, fn)
    return this
  }

  page (message, fn) {
    debug('page(%j)', message)
    validate(message)
    assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".')
    message.type = 'page'
    this.enqueue(message, fn)
    return this
  }

  alias (message, fn) {
    debug('alias(%j)', message)
    validate(message)
    assert(message.userId, 'You must pass a "userId".')
    assert(message.previousId, 'You must pass a "previousId".')
    message.type = 'alias'
    this.enqueue(message, fn)
    return this
  }

  enqueue (message, fn) {
    debug('enqueue(%j)', message)
    message.context = extend(message.context || {}, { library: { name: 'analytics-node', version: version } })
    if (!message.timestamp) message.timestamp = new Date()
    if (!message.messageId) message.messageId = 'node-' + uid(32)
    this.queue.push({
      message: message,
      callback: fn || function () {}
    })
    if (this.queue.length >= this.flushAt) this.flush()
    if (this.timer) clearTimeout(this.timer)
    if (this.flushAfter) this.timer = setTimeout(this.flush.bind(this), this.flushAfter)
  }

  flush () {
    debug('flush()')
    const items = this.queue.splice(0, this.flushAt)
    const callbacks = items.map(item => item.callback)
    const batch = items.map(item => item.message)

    const data = { batch: batch, timestamp: new Date(), sentAt: new Date() }

    return new Promise((resolve, reject) => {
      request
      .post(`${this.host}/v1/batch`)
      .auth(this.writeKey, '')
      .retry(3)
      .send(data)
      .end((err, res) => {
        callbacks.forEach((callback, i) => callback(err, batch[i]))

        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }
}

function validate (message) {
  assert(typeof message, 'object')
  if (message.integrations) assert(typeof message.integrations, 'object')
  if (message.anonymousId) assert(typeof message.anonymousId, 'string')
  if (message.previousId) assert(typeof message.previousId, 'string')
  if (message.category) assert(typeof message.anonymousId, 'string')
  if (message.timestamp) assert(typeof message.timestamp, 'date')
  if (message.context) assert(typeof message.context, 'object')
  if (message.groupId) assert(typeof message.groupId, 'string')
  if (message.userId) assert(typeof message.userId, 'string')
  if (message.event) assert(typeof message.event, 'string')
  if (message.name) assert(typeof message.name, 'string')
}

module.exports = Analytics
