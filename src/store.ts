/*!
 * Connect - session - Store
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2025 Mehmet Güleryüz
 * MIT Licensed
 */

'use strict'

// Node.js built-in modules
import { EventEmitter } from 'events'

// Internal imports
import { Cookie } from '@/cookie'
import { Session } from '@/session'

// Types
import type { SessionData } from '@/types'

/**
 * Abstract base class for session stores.
 * @public
 */
export abstract class Store extends EventEmitter {
  constructor() {
    super()
  }

  /**
   * Re-generate the given requests's session.
   *
   * @param {RequestSessionExtender} req
   * @param {Function} callback
   */
  regenerate(req: any, callback: (err?: any) => void): void {
    const self = this
    this.destroy(req.sessionID!, (err) => {
      // @ts-expect-error - generate is not a method of Store added during runtime
      self.generate(req)
      callback(err)
    })
  }

  /**
   * Load a `Session` instance via the given `sid`
   * and invoke the callback `callback(err, session)`.
   */
  load(sid: string, callback: (err: any, session?: SessionData) => any): void {
    const self = this
    this.get(sid, (err, session) => {
      if (err) return callback(err)
      if (!session) return callback('session not found') // Changed to match reference implementation order
      const req = { sessionID: sid, sessionStore: self }
      callback(null, this.createSession(req, session))
    })
  }

  /**
   * Create session from JSON `sess` data.
   */
  createSession(
    req: any,
    session: SessionData
  ): Omit<Session, '_id' | 'req'> & SessionData {
    const expires = session.cookie.expires
    const originalMaxAge = session.cookie.originalMaxAge

    // Create new cookie first (matches reference implementation order)
    session.cookie = new Cookie((session.cookie as Cookie).data)

    if (typeof expires === 'string') {
      session.cookie.expires = new Date(expires)
    }

    session.cookie.originalMaxAge = originalMaxAge

    // Create and assign session in one step
    req.session = new Session(req, session)
    return req.session
  }

  // Abstract methods that should be implemented by subclasses

  /**
   * Gets the session from the store given a session ID and passes it to `callback`.
   *
   * The `session` argument should be a `Session` object if found, otherwise `null` or `undefined` if the session was not found and there was no error.
   * A special case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.
   */
  abstract get(
    sid: string,
    callback: (err: any, session?: SessionData | null) => void
  ): void

  /** Upsert a session in the store given a session ID and `SessionData` */
  abstract set(
    sid: string,
    session: SessionData,
    callback?: (err?: any) => void
  ): void

  /** Destroys the session with the given session ID. */
  abstract destroy(sid: string, callback?: (err?: any) => void): void

  /** Returns all sessions in the store */
  // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/38783, https://github.com/expressjs/session/pull/700#issuecomment-540855551
  abstract all?(
    callback: (
      err: any,
      obj?: SessionData[] | { [sid: string]: SessionData } | null
    ) => void
  ): void

  /** Returns the amount of sessions in the store. */
  abstract length?(callback: (err: any, length?: number) => void): void

  /** Delete all sessions from the store. */
  abstract clear?(callback?: (err?: any) => void): void

  /** "Touches" a given session, resetting the idle timer. */
  abstract touch?(
    sid: string,
    session: SessionData,
    callback?: (err?: any) => void
  ): void
}
