/*!
 * Connect - session - Session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2025 Mehmet Güleryüz
 * MIT Licensed
 */

'use strict'

// Internal imports
import { Cookie } from '@/cookie'

// Types
import type { RequestSessionExtender, SessionData } from '@/types'

export class Session implements SessionData {
  [key: string]: any
  #req: RequestSessionExtender
  #_id: string
  /**
   * Each session has a unique cookie object accompany it.
   * This allows you to alter the session cookie per visitor.
   * For example we can set `req.session.cookie.expires` to `false` to enable the cookie to remain for only the duration of the user-agent.
   */
  cookie!: Cookie

  /**
   * Each session has a unique ID associated with it.
   * This property is an alias of `req.sessionID` and cannot be modified.
   * It has been added to make the session ID accessible from the session object.
   */
  public get id(): string {
    return this.#_id
  }

  constructor(req: RequestSessionExtender, data: SessionData | null) {
    this.#req = req
    this.#_id = req.sessionID

    // Initialize the cookie object first
    if (req.session?.cookie) {
      this.cookie = new Cookie(req.session.cookie)
    } else {
      this.cookie = new Cookie()
    }

    if (typeof data === 'object' && data !== null) {
      // merge data into this, ignoring prototype properties
      for (const prop in data) {
        if (!(prop in this)) {
          this[prop] = data[prop as keyof SessionData]
        }
      }
    }
  }

  /** Updates the `maxAge` property. Typically this is not necessary to call, as the session middleware does this for you. */
  touch() {
    return this.resetMaxAge()
  }

  /**
   * Resets the cookie's `maxAge` to `originalMaxAge`
   * @see Cookie
   */
  resetMaxAge() {
    this.cookie.maxAge = this.cookie.originalMaxAge ?? undefined
    return this
  }

  /**
   * Save the session back to the store, replacing the contents on the store with the contents in memory
   *   (though a store may do something else - consult the store's documentation for exact behavior).
   *
   * This method is automatically called at the end of the HTTP response if the session data has been altered
   *   (though this behavior can be altered with various options in the middleware constructor).
   * Because of this, typically this method does not need to be called.
   * There are some cases where it is useful to call this method, for example: redirects, long-lived requests or in WebSockets.
   */
  save(fn?: (err?: any) => void) {
    this.#req.sessionStore.set(this.id, this, fn || (() => {}))
    return this
  }

  /** Reloads the session data from the store and re-populates the `req.session` object. Once complete, the `callback` will be invoked. */
  reload(fn: (err?: any) => void): this {
    const req = this.#req
    const store = this.#req.sessionStore

    store.get(this.id, (err, sess) => {
      if (err) return fn(err)
      if (!sess) return fn(new Error('failed to load session'))
      store.createSession(req, sess)
      fn()
    })
    return this
  }

  /** Destroys the session and will unset the `req.session` property. Once complete, the `callback` will be invoked. */
  destroy(fn?: (err?: any) => void): this {
    // @ts-expect-error - The operand of a 'delete' operator must be optional.ts(2790)
    delete this.#req.session
    this.#req.sessionStore.destroy(this.id, fn || (() => {}))
    return this
  }

  /** To regenerate the session simply invoke the method. Once complete, a new SID and `Session` instance will be initialized at `req.session` and the `callback` will be invoked. */
  regenerate(fn: (err?: any) => void): this {
    this.#req.sessionStore.regenerate(this.#req, fn)
    return this
  }
}
