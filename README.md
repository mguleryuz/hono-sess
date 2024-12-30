# hono-session

A session middleware for Hono applications.

## Installation

```sh
npm install hono-session
```

## API

```ts
import { session } from 'hono-session'
```

### session(options)

Create a session middleware with the given `options`.

**Note** Session data is _not_ saved in the cookie itself, just the session ID.
Session data is stored server-side.

**Warning** The default server-side session storage, `MemoryStore`, is _purposely_
not designed for a production environment. It will leak memory under most
conditions, does not scale past a single process, and is meant for debugging and
developing.

#### Options

`hono-session` accepts these properties in the options object:

##### cookie

Settings object for the session ID cookie. The default value is
`{ path: '/', httpOnly: true, secure: false, maxAge: null }`.

The following are options that can be set in this object:

- `domain`: Specifies the Domain attribute
- `expires`: Specifies the Expires attribute
- `httpOnly`: Sets the HttpOnly attribute
- `maxAge`: Number of milliseconds until cookie expires
- `path`: Cookie path
- `secure`: Sets Secure attribute
- `sameSite`: Sets SameSite attribute ('lax', 'strict', 'none')

##### secret

**Required option**

This is the secret used to sign the session ID cookie. Can be a string or Buffer.

##### store

The session store instance. Defaults to `MemoryStore`.

### Basic Usage

```ts
import { Hono } from 'hono'
import { session } from 'hono-session'

const app = new Hono()

app.use(
  session({
    secret: 'keyboard cat',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
    },
  })
)

app.get('/', (c) => {
  // Access session data
  const session = c.get('session')

  if (!session.views) {
    session.views = 0
  }
  session.views++

  return c.text(`Views: ${session.views}`)
})
```

## Session Stores

The following are some compatible session stores that can be adapted for use with hono-session:

- Redis
- MongoDB
- PostgreSQL
- SQLite
- Memory (default, for development only)

## License

MIT
