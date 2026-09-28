export default defineEventHandler((event) => {
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'Referrer-Policy', 'same-origin')
  if (!getRequestURL(event).pathname.startsWith('/_nuxt/')) setHeader(event, 'Cache-Control', 'no-store')
})
