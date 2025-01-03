// @ts-nocheck

import { Hono } from 'hono'
import session from '../src'

const app = new Hono()

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  })
)

app.use(async (c, next) => {
  if (!c.req.session.views) {
    c.req.session.views = {}
  }

  // get the url pathname
  const pathname = c.req.path

  // count the views
  c.req.session.views[pathname] = (c.req.session.views[pathname] || 0) + 1

  return await next()
})

app.get('/foo', (c) => {
  return c.html(`you viewed this page ${c.req.session.views!['/foo']} times`)
})

app.get('/bar', (c) => {
  return c.html(`you viewed this page ${c.req.session.views!['/bar']} times`)
})

export default {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  fetch: app.fetch,
}
