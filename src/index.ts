/*!
 * hono-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2025 Mehmet Güleryüz
 * MIT Licensed
 */

'use strict'

// External Imports
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import crypto from 'crypto'

// Internal Imports
import { Cookie } from './cookie'
import { MemoryStore } from './memory'
import { Session } from './session'
import { Store } from './store'
import {
  issecure,
  warning,
  debug,
  deprecate,
  hash,
  expressCookieOptionsToHonoCookieOptions,
} from './utils'

// Type Imports
import type { MiddlewareHandler } from 'hono'
import type {
  ExtendedContext,
  ExtendedHonoRequest,
  SessionData,
  SessionOptions,
  SessionStore,
} from './types'

// environment
let env = process.env.NODE_ENV

// Export
export { Store, Cookie, Session, MemoryStore }
export * from './types'

export function session({
  cookie = {},
  genid = crypto.randomUUID,
  name = 'connect.sid',
  store = new MemoryStore(),
  proxy = false,
  resave = false,
  rolling = false,
  saveUninitialized = true,
  secret = 'dev-secret' as unknown as string[],
  unset = 'keep',
}: SessionOptions): MiddlewareHandler {
  if (typeof genid !== 'function')
    throw new TypeError('genid option must be a function')

  if (resave === undefined) {
    deprecate('undefined resave option; provide resave option')
    resave = true
  }

  if (saveUninitialized === undefined) {
    deprecate(
      'undefined saveUninitialized option; provide saveUninitialized option'
    )
    saveUninitialized = true
  }

  if (unset !== 'destroy' && unset !== 'keep')
    throw new TypeError('unset option must be "destroy" or "keep"')

  const unsetDestroy = unset === 'destroy'

  if (Array.isArray(secret) && secret.length === 0) {
    throw new TypeError('secret option array must contain one or more strings')
  }

  if (secret && !Array.isArray(secret)) secret = [secret]

  if (!secret) deprecate('req.secret; provide secret option')

  // notify user that this store is not
  // meant for a production environment
  // not tested
  if (env === 'production' && store instanceof MemoryStore)
    console.warn(warning)

  // generates the new session
  // @ts-expect-error - generate is not a method of Store added during runtime
  store.generate = function (req: ExtendedHonoRequest): void {
    req.sessionID = genid()
    req.session = new Session(req, null)
    req.session.cookie = new Cookie(cookie)

    if (cookie.secure === 'auto') {
      req.session.cookie.secure = issecure(req, proxy)
    }
  }

  const storeImplementsTouch = typeof store.touch === 'function'

  // register event listeners for the store to track readiness
  let storeReady = true

  store.on('disconnect', function ondisconnect() {
    storeReady = false
  })
  store.on('connect', function onconnect() {
    storeReady = true
  })

  return async function session(context, next) {
    const c = context as ExtendedContext

    // Step 1: Self-awareness
    if (c.req.session as unknown) {
      return await next()
    }

    // Step 2: Handle connection as if there is no session if
    // the store has temporarily disconnected etc
    if (!storeReady) {
      debug('store is disconnected')
      return await next()
    }

    // Step 3: pathname mismatch
    if (c.req.path.indexOf(cookie.path || '/') !== 0) {
      debug('pathname mismatch')
      return await next()
    }

    // Step 4: ensure a secret is available or bail
    if (!secret) {
      console.error('secret option required for sessions')
      return await next()
    }

    let secrets = secret as unknown as string[]

    let originalHash: string | null = null
    let originalId: string | null = null
    let savedHash: string | null = null
    let touched = false

    // expose store
    c.req.sessionStore = store as SessionStore

    // get the session ID from the cookie and set it to the request
    const signedCookie = <string>(
      ((await getSignedCookie(
        c,
        new TextEncoder().encode(secrets.join(',')),
        name
      )) || undefined)
    )

    let cookieId = (c.req.sessionID = signedCookie)

    // Handle Cookies
    await (async () => {
      if (!c.req.session) {
        c.req.session
        debug('no session')
        return
      }

      if (!shouldSetCookie(c.req)) {
        return
      }

      // only send secure cookies via https
      if (c.req.session.cookie.secure && !issecure(c.req, proxy)) {
        debug('not secured')
        return
      }

      if (!touched) {
        // touch session
        c.req.session.touch()
        touched = true
      }

      // set cookie
      try {
        const cookieData = (c.req.session.cookie as Cookie).data
        setSignedCookie(
          c,
          name,
          c.req.sessionID,
          new TextEncoder().encode(secrets.join(',')),
          expressCookieOptionsToHonoCookieOptions(cookieData, c.req, proxy)
        )
      } catch (err) {
        console.error(err)
        return await next()
      }
    })()

    const getNext = () =>
      next().then(async (nextResult) => {
        // ===============================
        // POST NEXT START
        // ===============================

        if (shouldDestroy(c.req)) {
          // destroy session
          debug('destroying')
          await new Promise<void>((resolve, reject) => {
            store.destroy(c.req.sessionID, (err) => {
              if (err) reject(err)

              debug('destroyed')
              resolve()
            })
          })
        }

        // no session to save
        if (!c.req.session) {
          debug('no session at post next')
          return nextResult
        }

        if (!touched) {
          // touch session
          c.req.session.touch()
          touched = true
        }

        if (shouldSave(c.req)) {
          await new Promise<void>((resolve, reject) => {
            c.req.session.save((err: any) => {
              if (err) {
                reject(err)
              }

              resolve()
            })
          })
        } else if (storeImplementsTouch && shouldTouch(c.req)) {
          // store implements touch method
          debug('touching')
          await new Promise<void>((resolve, reject) => {
            store.touch?.(c.req.sessionID, c.req.session, (err) => {
              if (err) {
                reject(err)
              }

              debug('touched')
              resolve()
            })
          })
          return nextResult
        }

        return nextResult
      })

    // ===============================
    // UTILS START
    // ===============================

    // generate the session
    function generate() {
      debug('generating')
      // @ts-expect-error - generate is not a method of Store added during runtime
      store.generate(c.req)
      originalId = c.req.sessionID
      originalHash = hash(c.req.session)
      wrapmethods(c.req.session)
    }

    // inflate the session
    function inflate(req: ExtendedHonoRequest, session: SessionData) {
      debug('inflating')
      store.createSession(req, session)
      originalId = req.sessionID
      originalHash = hash(session)

      if (!resave) {
        savedHash = originalHash
      }

      wrapmethods(session)
    }

    function rewrapmethods(session: SessionData, callback: () => void) {
      debug('rewrapmethods')
      return function () {
        if (c.req.session !== session) {
          wrapmethods(c.req.session)
        }

        // @ts-expect-error - callback is not typed
        callback.apply(this, arguments)
      }
    }

    // wrap session methods
    function wrapmethods(session: SessionData) {
      const _reload = session.reload
      const _save = session.save

      function reload(callback: () => void) {
        debug('reloading %s', session.id)
        _reload.call(session, rewrapmethods(session, callback))
      }

      function save() {
        debug('saving %s', session.id)
        savedHash = hash(session)
        _save.apply(session, arguments)
      }

      Object.defineProperty(session, 'reload', {
        configurable: true,
        enumerable: false,
        value: reload,
        writable: true,
      })

      Object.defineProperty(session, 'save', {
        configurable: true,
        enumerable: false,
        value: save,
        writable: true,
      })
    }

    // check if session has been modified
    function isModified(session: SessionData) {
      return originalId !== session.id || originalHash !== hash(session)
    }

    // check if session has been saved
    function isSaved(session: SessionData) {
      return originalId === session.id && savedHash === hash(session)
    }

    // determine if session should be destroyed
    function shouldDestroy(req: ExtendedHonoRequest) {
      return req.sessionID && unsetDestroy && req.session == null
    }

    // determine if session should be saved to store
    function shouldSave(req: ExtendedHonoRequest) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug(
          'session ignored because of bogus req.sessionID %o',
          req.sessionID
        )
        return false
      }

      return !saveUninitialized && !savedHash && cookieId !== req.sessionID
        ? isModified(req.session)
        : !isSaved(req.session)
    }

    // determine if session should be touched
    function shouldTouch(req: ExtendedHonoRequest) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug(
          'session ignored because of bogus req.sessionID %o',
          req.sessionID
        )
        return false
      }

      return cookieId === req.sessionID && !shouldSave(req)
    }

    // determine if cookie should be set on response
    function shouldSetCookie(req: ExtendedHonoRequest) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        return false
      }

      return cookieId !== req.sessionID
        ? saveUninitialized || isModified(req.session)
        : rolling ||
            (req.session.cookie.expires != null && isModified(req.session))
    }

    // ===============================
    // PRE NEXT START
    // ===============================

    // generate a session if the browser doesn't send a sessionID
    if (!c.req.sessionID) {
      debug('no SID sent, generating session')
      generate()
      return getNext()
    }

    // generate the session object
    debug('fetching %s', c.req.sessionID)
    store.get(c.req.sessionID, (err, session) => {
      // error handling
      if (err && err.code !== 'ENOENT') {
        debug('error %j', err)
        return getNext()
      }

      try {
        if (err || !session) {
          debug('no session found')
          generate()
        } else {
          debug('session found')
          inflate(c.req, session)
        }
      } catch (e) {
        console.error(e)
        return getNext()
      }

      return getNext()
    })
  }
}
