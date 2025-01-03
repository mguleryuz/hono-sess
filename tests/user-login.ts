// @ts-nocheck

import { Hono } from 'hono'
import session from '../src'

import type { Context, Next } from 'hono'

const app = new Hono()

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  })
)

// middleware to test if authenticated
async function isAuthenticated(c: Context, next: Next) {
  if (!c.req.session.user) {
    return c.redirect('/login')
  }
  return await next()
}

app.get('/', isAuthenticated, (c) => {
  return c.html(`hello, ${c.req.session.user}! <a href="/logout">Logout</a>`)
})

app.get('/login', (c) => {
  return c.html(
    '<form action="/login" method="post">' +
      'Username: <input name="user"><br>' +
      'Password: <input name="pass" type="password"><br>' +
      '<input type="submit" text="Login"></form>'
  )
})

app.post('/login', async (c) => {
  const { user } = await c.req.parseBody()

  // login logic would go here

  // store user information and save session
  c.req.session.user = user
  c.req.session.save()

  return c.redirect('/')
})

app.get('/logout', async (c) => {
  c.req.session.user = null
  c.req.session.save()
  c.req.session.regenerate((err) => {
    console.error(err)
  })

  return c.redirect('/')
})

// Export server configuration
export default {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  fetch: app.fetch,
}
