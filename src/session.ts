/*!
 * Connect - session - Session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict'

import type { Cookie } from './cookie'
import type { IncomingRequest, SessionData } from './types'

export class Session implements SessionData {
  [key: string]: any
  private readonly req!: IncomingRequest
  public readonly id!: string
  public cookie!: Cookie

  /**
   * Create a new `Session` with the given request and `data`.
   *
   * @param {IncomingRequest} req
   * @param {Object} data
   * @api private
   */
  constructor(req: IncomingRequest, data: SessionData | null) {
    Object.defineProperty(this, 'req', { value: req })
    Object.defineProperty(this, 'id', { value: req.sessionID })

    if (typeof data === 'object' && data !== null) {
      // merge data into this, ignoring prototype properties
      for (const prop in data) {
        if (!(prop in this)) {
          this[prop] = data[prop]
        }
      }
    }
  }

  /**
   * Update reset `.cookie.maxAge` to prevent
   * the cookie from expiring when the
   * session is still active.
   *
   * @return {Session} for chaining
   * @api public
   */
  touch(): this {
    return this.resetMaxAge()
  }

  /**
   * Reset `.maxAge` to `.originalMaxAge`.
   *
   * @return {Session} for chaining
   * @api public
   */
  resetMaxAge(): this {
    this.cookie.maxAge = this.cookie.originalMaxAge
    return this
  }

  /**
   * Save the session data with optional callback `fn(err)`.
   *
   * @param {Function} fn
   * @return {Session} for chaining
   * @api public
   */
  save(fn?: (err?: any) => void): this {
    this.req.sessionStore.set(this.id, this, fn || (() => {}))
    return this
  }

  /**
   * Re-loads the session data _without_ altering
   * the maxAge properties. Invokes the callback `fn(err)`,
   * after which time if no exception has occurred the
   * `req.session` property will be a new `Session` object,
   * although representing the same session.
   *
   * @param {Function} fn
   * @return {Session} for chaining
   * @api public
   */
  reload(fn: (err?: any) => void): this {
    const req = this.req
    const store = this.req.sessionStore

    store.get(this.id, (err, sess) => {
      if (err) return fn(err)
      if (!sess) return fn(new Error('failed to load session'))
      store.createSession(req, sess)
      fn()
    })
    return this
  }

  /**
   * Destroy `this` session.
   *
   * @param {Function} fn
   * @return {Session} for chaining
   * @api public
   */
  destroy(fn?: (err?: any) => void): this {
    delete this.req.session
    this.req.sessionStore.destroy(this.id, fn || (() => {}))
    return this
  }

  /**
   * Regenerate this request's session.
   *
   * @param {Function} fn
   * @return {Session} for chaining
   * @api public
   */
  regenerate(fn: (err?: any) => void): this {
    this.req.sessionStore.regenerate(this.req, fn)
    return this
  }
}
