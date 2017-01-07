import test from 'ava'
import Analytics from './'

const WRITEKEY = 'test-key'
const HOST = 'localhost:3000'

test('requires a write key', t => {
  const error = t.throws(() => new Analytics())
  t.is(error.message, 'You must pass a write key.')
})

test('creates a queue', t => {
  const analytics = new Analytics(WRITEKEY)
  t.deepEqual(analytics.queue, [])
})

test('sets default options', t => {
  const analytics = new Analytics(WRITEKEY)
  t.is(analytics.writeKey, WRITEKEY)
  t.is(analytics.host, 'https://api.segment.com')
  t.is(analytics.flushAt, 20)
  t.is(analytics.flushAfter, 10000)
})

test('merges options', t => {
  const analytics = new Analytics(WRITEKEY, { host: HOST, flushAt: 1, flushAfter: 2 })
  t.is(analytics.host, HOST)
  t.is(analytics.flushAt, 1)
  t.is(analytics.flushAfter, 2)
})

test('keeps flushAt option above zero', t => {
  const analytics = new Analytics(WRITEKEY, { flushAt: 0 })
  t.is(analytics.flushAt, 1)
})
