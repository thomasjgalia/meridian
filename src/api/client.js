/**
 * Thin fetch wrapper for the Meridian API.
 * SWA injects the auth cookie automatically — no bearer token needed.
 */

async function request(method, path, body) {
  const opts = { method, headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(path, opts)

  if (!res.ok) {
    let message = `${method} ${path} → ${res.status}`
    try { const j = await res.json(); message = j.error ?? message } catch { /* ignore */ }
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}
