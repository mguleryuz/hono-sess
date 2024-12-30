/*!
 * Connect - session - Store
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict'

import { EventEmitter } from 'events'
import { Cookie } from './cookie'
import { Session } from './session'
import type { IncomingRequest, SessionData } from './types'

/**
 * Abstract base class for session stores.
 * @public
 */
export class Store extends EventEmitter {
  constructor() {
    super()
  }

  /**
   * Re-generate the given requests's session.
   *
   * @param {IncomingRequest} req
   * @param {Function} fn
   * @api public
   */
  regenerate(req: IncomingRequest, fn: (err?: any) => void): void {
    this.destroy(req.sessionID, (err) => {
      this.generate(req)
      fn(err)
    })
  }

  /**
   * Load a `Session` instance via the given `sid`
   * and invoke the callback `fn(err, sess)`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */
  load(sid: string, fn: (err: any, sess?: Session) => void): void {
    this.get(sid, (err, sess) => {
      if (err) return fn(err)
      if (!sess) return fn(err)
      const req = { sessionID: sid, sessionStore: this }
      fn(null, this.createSession(req, sess))
    })
  }

  /**
   * Create session from JSON `sess` data.
   *
   * @param {IncomingRequest} req
   * @param {Object} sess
   * @return {Session}
   * @api private
   */
  createSession(req: IncomingRequest, sess: SessionData): Session {
    const expires = sess.cookie.expires
    const originalMaxAge = sess.cookie.originalMaxAge

    sess.cookie = new Cookie(sess.cookie.data)

    if (typeof expires === 'string') {
      sess.cookie.expires = new Date(expires)
    }

    sess.cookie.originalMaxAge = originalMaxAge

    req.session = new Session(req, sess)
    return req.session
  }

  // Abstract methods that should be implemented by subclasses
  get(_sid: string, _fn: (err: any, sess?: SessionData) => void): void {
    throw new Error('Not implemented')
  }

  destroy(_sid: string, _fn: (err?: any) => void): void {
    throw new Error('Not implemented')
  }

  generate(_req: IncomingRequest): void {
    throw new Error('Not implemented')
  }

  set(_sid: string, _session: SessionData, _fn: (err?: any) => void): void {
    throw new Error('Not implemented')
  }
}
