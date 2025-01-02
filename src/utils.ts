import crypto from 'crypto'
import dbg from 'debug'
import depd from 'depd'
import type { CookieOptions, SessionData } from '@/types'
import type { CookieOptions as HonoCookieOptions } from 'hono/utils/cookie'
import type { HonoRequest } from 'hono'

/**
 * Debugging
 */
export const debug = dbg('hono-session')

/**
 * Deprecation
 */
export const deprecate = depd('hono-session')

/**
 * Warning message for `MemoryStore` usage in production.
 * @private
 */
export const warning =
  'Warning: connect.session() MemoryStore is not\n' +
  'designed for a production environment, as it will leak\n' +
  'memory, and will not scale past a single process.'

/**
 * Hash the given `session` object omitting changes to `.cookie`.
 */
export function hash(session: SessionData): string {
  // serialize
  var str = JSON.stringify(session, function (key, val) {
    // ignore session.cookie property
    if (this === session && key === 'cookie') {
      return
    }

    return val
  })

  // hash
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex')
}

/**
 * Determine if request is secure.
 */
export function issecure(req: HonoRequest, trustProxy?: boolean): boolean {
  // Check if the raw request URL uses HTTPS
  if (req.url.startsWith('https://') || req.url.startsWith('wss://')) {
    return true
  }

  // do not trust proxy
  if (trustProxy === false) {
    return false
  }

  // read the proto from x-forwarded-proto header
  var header = req.header('x-forwarded-proto') || ''
  var index = header.indexOf(',')
  var proto =
    index !== -1
      ? header.substring(0, index).toLowerCase().trim()
      : header.toLowerCase().trim()

  return proto === 'https'
}

export function expressCookieOptionsToHonoCookieOptions(
  options: CookieOptions,
  req: HonoRequest,
  proxy?: boolean
): HonoCookieOptions {
  const { priority, ...rest } = options
  return {
    ...rest,
    sameSite: typeof options.sameSite === 'boolean' ? 'lax' : options.sameSite,
    // TODO: fix this after hono@4.6.6
    // priority: options.priority
    //   ? ((options.priority.charAt(0).toUpperCase() +
    //       options.priority.slice(1)) as 'Low' | 'Medium' | 'High')
    //   : undefined,
    expires: options.expires || undefined,
    secure: options.secure === 'auto' ? issecure(req, proxy) : options.secure,
  }
}
