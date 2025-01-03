// Node.js built-in modules
import type { CipherKey } from 'crypto'

// Third-party dependencies
import type { Context, HonoRequest, Next } from 'hono'

// Internal imports
import type { Cookie } from './cookie'
import type { Session } from './session'
import type { Store } from './store'

// --- Core Session Types ---
export type SessionMiddleware = (
  options: SessionOptions
) => (c: Context, next: Next) => Promise<Response | void>

export type SessionStore = Store & {
  generate: (req: RequestSessionExtender) => void
}

// --- Request Extension Types ---
/**
 * This interface allows you to declare additional properties on your session object using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).
 *
 * @example
 * import 'hono'
 * import { RequestSessionExtender } from 'hono-sess'
 *
 * declare module 'hono' {
 *     interface HonoRequest extends RequestSessionExtender<{
 *         views: number;
 *     }> {}
 * }
 */
export interface RequestSessionExtender<T extends {} = {}> {
  /**
   * This request's `Session` object.
   * Even though this property isn't marked as optional, it won't exist until you use the `hono-sess` middleware
   * [Declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) can be used to add your own properties.
   *
   * @see RequestSessionExtender
   */
  session: Session & SessionData & T

  /**
   * This request's session ID.
   * Even though this property isn't marked as optional, it won't exist until you use the `hono-sess` middleware
   */
  sessionID: string

  /**
   * The Store in use.
   * Even though this property isn't marked as optional, it won't exist until you use the `hono-sess` middleware
   * The function `generate` is added by hono-sess
   */
  sessionStore: SessionStore
}

export interface ExtendedHonoRequest<T extends {} = {}>
  extends HonoRequest,
    RequestSessionExtender<T> {}

export type ExtendedContext<T extends {} = {}> = Context & {
  req: ExtendedHonoRequest<T>
}

// --- Configuration Interfaces ---
export interface SessionData {
  [key: string]: any
  cookie: Omit<
    Cookie,
    'serialize' | 'toJSON' | '_expires' | 'data' | 'expires' | 'maxAge'
  > & { expires?: Date | null; maxAge?: number | null }
}

export interface CookieOptions {
  /**
   * Specifies the number (in milliseconds) to use when calculating the `Expires Set-Cookie` attribute.
   * This is done by taking the current server time and adding `maxAge` milliseconds to the value to calculate an `Expires` datetime. By default, no maximum age is set.
   *
   * If both `expires` and `maxAge` are set in the options, then the last one defined in the object is what is used.
   * `maxAge` should be preferred over `expires`.
   *
   * @see expires
   */
  maxAge?: number | undefined

  /**
   * Specifies the `boolean` value for the [`Partitioned` `Set-Cookie`](https://tools.ietf.org/html/draft-cutler-httpbis-partitioned-cookies/)
   * attribute. When truthy, the `Partitioned` attribute is set, otherwise it is not.
   * By default, the `Partitioned` attribute is not set.
   *
   * **Note** This is an attribute that has not yet been fully standardized, and may
   * change in the future. This also means many clients may ignore this attribute until
   * they understand it.
   */
  partitioned?: boolean | undefined

  /**
   * Specifies the `string` to be the value for the [`Priority` `Set-Cookie` attribute](https://tools.ietf.org/html/draft-west-cookie-priority-00#section-4.1).
   *
   * - `'low'` will set the `Priority` attribute to `Low`.
   * - `'medium'` will set the `Priority` attribute to `Medium`, the default priority when not set.
   * - `'high'` will set the `Priority` attribute to `High`.
   *
   * More information about the different priority levels can be found in
   * [the specification](https://tools.ietf.org/html/draft-west-cookie-priority-00#section-4.1).
   *
   * **Note** This is an attribute that has not yet been fully standardized, and may change in the future.
   * This also means many clients may ignore this attribute until they understand it.
   */
  priority?: 'low' | 'medium' | 'high' | undefined

  signed?: boolean | undefined

  /**
   * Specifies the `Date` object to be the value for the `Expires Set-Cookie` attribute.
   * By default, no expiration is set, and most clients will consider this a "non-persistent cookie" and will delete it on a condition like exiting a web browser application.
   *
   * If both `expires` and `maxAge` are set in the options, then the last one defined in the object is what is used.
   *
   * @deprecated The `expires` option should not be set directly; instead only use the `maxAge` option
   * @see maxAge
   */
  expires?: Date | null | undefined

  /**
   * Specifies the boolean value for the `HttpOnly Set-Cookie` attribute. When truthy, the `HttpOnly` attribute is set, otherwise it is not.
   * By default, the `HttpOnly` attribute is set.
   *
   * Be careful when setting this to `true`, as compliant clients will not allow client-side JavaScript to see the cookie in `document.cookie`.
   */
  httpOnly?: boolean | undefined

  /**
   * Specifies the value for the `Path Set-Cookie` attribute.
   * By default, this is set to '/', which is the root path of the domain.
   */
  path?: string | undefined

  /**
   * Specifies the value for the `Domain Set-Cookie` attribute.
   * By default, no domain is set, and most clients will consider the cookie to apply to only the current domain.
   */
  domain?: string | undefined

  /**
   * Specifies the boolean value for the `Secure Set-Cookie` attribute. When truthy, the `Secure` attribute is set, otherwise it is not. By default, the `Secure` attribute is not set.
   * Be careful when setting this to true, as compliant clients will not send the cookie back to the server in the future if the browser does not have an HTTPS connection.
   *
   * Please note that `secure: true` is a **recommended option**.
   * However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies.
   * If `secure` is set, and you access your site over HTTP, **the cookie will not be set**.
   */
  secure?: boolean | 'auto' | undefined

  encode?: ((val: string) => string) | undefined

  /**
   * Specifies the boolean or string to be the value for the `SameSite Set-Cookie` attribute.
   * - `true` will set the `SameSite` attribute to `Strict` for strict same site enforcement.
   * - `false` will not set the `SameSite` attribute.
   * - `lax` will set the `SameSite` attribute to `Lax` for lax same site enforcement.
   * - `none` will set the `SameSite` attribute to `None` for an explicit cross-site cookie.
   * - `strict` will set the `SameSite` attribute to `Strict` for strict same site enforcement.
   */
  sameSite?: boolean | 'lax' | 'strict' | 'none' | undefined
}

/**
 * Session middleware options
 */
export interface SessionOptions {
  /**
   * This is the secret used to sign the session ID cookie.
   * The secret can be any type of value that is supported by Node.js `crypto.createHmac` (like a string or a Buffer).
   * This can be either a single secret, or an array of multiple secrets.
   * If an array of secrets is provided, only the first element will be used to sign the session ID cookie, while all the elements will be considered when verifying the signature in requests.
   */
  secret: CipherKey | CipherKey[]

  /**
   * Function to call to generate a new session ID. Provide a function that returns a string that will be used as a session ID.
   * The function is given the request as the first argument if you want to use some value attached to it when generating the ID.
   */
  genid?(): string

  /**
   * The name of the session ID cookie to set in the response (and read from in the request).
   * The default value is 'connect.sid'.
   */
  name?: string | undefined

  /**
   * The session store instance, defaults to a new `MemoryStore` instance.
   * @see MemoryStore
   */
  store?: Store | undefined

  /**
   * Settings object for the session ID cookie.
   * @see CookieOptions
   */
  cookie?: CookieOptions | undefined

  /**
   * Force the session identifier cookie to be set on every response. The expiration is reset to the original `maxAge`, resetting the expiration countdown.
   * The default value is `false`.
   */
  rolling?: boolean | undefined

  /**
   * Forces the session to be saved back to the session store, even if the session was never modified during the request.
   */
  resave?: boolean | undefined

  /**
   * Trust the reverse proxy when setting secure cookies (via the "X-Forwarded-Proto" header).
   */
  proxy?: boolean | undefined

  /**
   * Forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified.
   */
  saveUninitialized?: boolean | undefined

  /**
   * Control the result of unsetting req.session (through delete, setting to null, etc.).
   * - `destroy`: The session will be destroyed (deleted) when the response ends.
   * - `keep`: The session in the store will be kept, but modifications made during the request are ignored and not saved.
   * @default 'keep'
   */
  unset?: 'destroy' | 'keep' | undefined
}
