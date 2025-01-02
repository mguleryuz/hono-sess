/*!
 * Connect - session - Cookie
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2025 Mehmet Güleryüz
 * MIT Licensed
 */

'use strict'

// Module dependencies.
import cookie from 'cookie'
import type { CookieOptions } from './types'

export class Cookie implements CookieOptions {
  path?: string
  private _expires: Date | null = null
  originalMaxAge: number | null = null
  httpOnly?: boolean
  partitioned?: boolean
  secure?: boolean | 'auto'
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

    if (this.originalMaxAge === undefined || this.originalMaxAge === null) {
      this.originalMaxAge = this.maxAge ?? null
    }
  }

  get expires(): Date | null | undefined {
    // Remove undefined from return type
    return this._expires || undefined
  }

  set expires(date: Date | null) {
    // Remove undefined from parameter type
    this._expires = date
    this.originalMaxAge = this.maxAge ?? null
  }

  set maxAge(ms: number | undefined | Date) {
    if (ms && typeof ms !== 'number' && !(ms instanceof Date)) {
      throw new TypeError('maxAge must be a number or Date')
    }

    if (ms instanceof Date) {
      console.warn('maxAge as Date; pass number of milliseconds instead')
    }

    this.expires = typeof ms === 'number' ? new Date(Date.now() + ms) : null
  }

  get maxAge(): number | undefined {
    return this.expires instanceof Date
      ? this.expires.valueOf() - Date.now()
      : undefined
  }

  get data() {
    return {
      originalMaxAge: this.originalMaxAge,
      partitioned: this.partitioned,
      expires: this._expires ?? undefined,
      secure: this.secure === 'auto' ? undefined : this.secure,
      httpOnly: this.httpOnly,
      domain: this.domain,
      path: this.path,
      sameSite: this.sameSite,
      priority: this.priority,
    }
  }

  serialize(name: string, val: string): string {
    return cookie.serialize(name, val, this.data)
  }

  toJSON(): CookieOptions {
    return this.data
  }
}
