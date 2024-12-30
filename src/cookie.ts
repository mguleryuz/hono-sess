/*!
 * Connect - session - Cookie
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

import cookie from 'cookie'
import deprecate from 'depd'
import type { CookieOptions } from 'hono/utils/cookie'

const deprecateMaxAge = deprecate('hono-session')

/**
 * Initialize a new `Cookie` with the given `options`.
 *
 * @param {Object} options
 * @api private
 */
export class Cookie {
  path: string = '/'
  private _expires: Date | null = null
  originalMaxAge: number | null = null
  httpOnly: boolean = true
  partitioned?: boolean
  secure?: boolean
  domain?: string
  sameSite?: CookieOptions['sameSite']
  priority?: CookieOptions['priority']

  constructor(options?: CookieOptions) {
    if (options) {
      if (typeof options !== 'object') {
        throw new TypeError('argument options must be a object')
      }

      for (const key in options) {
        if (key !== 'data') {
          const k = key as keyof CookieOptions
          this[k as keyof this] = options[k] as this[keyof this]
        }
      }
    }

    this.originalMaxAge = this.originalMaxAge ?? this.maxAge
  }

  /**
   * Set expires `date`.
   *
   * @param {Date} date
   * @api public
   */
  set expires(date: Date | null) {
    this._expires = date
    this.originalMaxAge = this.maxAge
  }

  /**
   * Get expires `date`.
   *
   * @return {Date}
   * @api public
   */
  get expires(): Date | null {
    return this._expires
  }

  /**
   * Set expires via max-age in `ms`.
   *
   * @param {Number} ms
   * @api public
   */
  set maxAge(ms: number | Date | null) {
    if (ms && typeof ms !== 'number' && !(ms instanceof Date)) {
      throw new TypeError('maxAge must be a number or Date')
    }

    if (ms instanceof Date) {
      deprecateMaxAge('maxAge as Date; pass number of milliseconds instead')
    }

    this.expires = typeof ms === 'number' ? new Date(Date.now() + ms) : ms
  }

  /**
   * Get expires max-age in `ms`.
   *
   * @return {Number}
   * @api public
   */
  get maxAge(): number | null {
    return this.expires instanceof Date
      ? this.expires.valueOf() - Date.now()
      : null
  }

  /**
   * Return cookie data object.
   *
   * @return {Object}
   * @api private
   */
  get data(): CookieOptions {
    return {
      partitioned: this.partitioned,
      expires: this._expires ?? undefined,
      secure: this.secure,
      httpOnly: this.httpOnly,
      domain: this.domain,
      path: this.path,
      sameSite: this.sameSite,
      priority: this.priority,
    }
  }

  /**
   * Return a serialized cookie string.
   *
   * @return {String}
   * @api public
   */
  serialize(name: string, val: string): string {
    return cookie.serialize(name, val, {
      ...this.data,
      sameSite: this.sameSite?.toLowerCase() as 'strict' | 'lax' | 'none',
      priority: this.priority?.toLowerCase() as 'low' | 'medium' | 'high',
    })
  }

  /**
   * Return JSON representation of this cookie.
   *
   * @return {Object}
   * @api private
   */
  toJSON(): CookieOptions {
    return this.data
  }
}
