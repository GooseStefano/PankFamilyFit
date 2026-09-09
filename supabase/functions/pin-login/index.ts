// Deploy with: supabase functions deploy pin-login --no-verify-jwt
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
const encoder = new TextEncoder()
const base64url = (input: Uint8Array | string) => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input
  let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
const equal = (left: string, right: string) => {
  if (left.length !== right.length) return false
  let result = 0; for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return result === 0
}
const signJwt = async (payload: Record<string, unknown>, secret: string) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload)); const input = `${header}.${body}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return `${input}.${base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(input))))}`
}

Deno.serve(async request => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' }
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  try {
    const { pin } = await request.json()
    if (typeof pin !== 'string' || !/^\d{5}$/.test(pin)) return new Response(JSON.stringify({ error: 'Неверный PIN.' }), { status: 401, headers })
    const projectUrl = Deno.env.get('SUPABASE_URL')!; const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')!
    if (!projectUrl || !serviceKey || !jwtSecret) throw new Error('Не настроены server-side secrets.')
    const access = await fetch(`${projectUrl}/rest/v1/pin_access?select=user_id,role,pin_hash,is_active&is_active=eq.true`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(response => response.json())
    const pinHash = await hash(pin); const matched = access.find((item: { pin_hash: string }) => equal(item.pin_hash, pinHash))
    if (!matched) return new Response(JSON.stringify({ error: 'Неверный PIN. Попробуйте ещё раз.' }), { status: 401, headers })
    const users = await fetch(`${projectUrl}/rest/v1/app_users?id=eq.${matched.user_id}&select=id,name,role`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(response => response.json())
    const user = users[0]; if (!user) throw new Error('Пользователь не найден.')
    const expiresAt = Date.now() + 1000 * 60 * 60 * 12
    const token = await signJwt({ role: 'authenticated', sub: user.id, app_user_id: user.id, app_role: user.role, exp: Math.floor(expiresAt / 1000) }, jwtSecret)
    const id = user.name === 'Даня' ? 'danya' : user.name === 'Вика' ? 'vika' : user.id
    return new Response(JSON.stringify({ token, expiresAt, user: { id, dbId: user.id, name: user.name, role: user.role } }), { headers })
  } catch (error) {
    console.error(error); return new Response(JSON.stringify({ error: 'Сервис входа временно недоступен.' }), { status: 500, headers })
  }
})
