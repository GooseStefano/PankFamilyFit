import { createClient } from 'npm:@supabase/supabase-js@2'

// Deploy with: supabase functions deploy pin-login --no-verify-jwt
// Required secrets: SUPABASE_URL, PANK_SERVICE_ROLE_KEY, PIN_JWT_SECRET
const encoder = new TextEncoder()
const base64url = (input: Uint8Array | string) => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input
  let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
const signJwt = async (payload: Record<string, unknown>, secret: string) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload)); const input = `${header}.${body}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return `${input}.${base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(input))))}`
}
Deno.serve(async request => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  try {
    const { pin } = await request.json()
    if (typeof pin !== 'string' || !/^\d{5}$/.test(pin)) return new Response(JSON.stringify({ error: 'Неверный PIN.' }), { status: 401, headers })
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('PANK_SERVICE_ROLE_KEY')
    const jwtSecret = Deno.env.get('PIN_JWT_SECRET')
    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) return new Response(JSON.stringify({ error: 'Не настроены server-side secrets' }), { status: 500, headers })
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error, status, statusText } = await supabase.rpc('pff_pin_login', { input_pin: pin })
    const rows = Array.isArray(data) ? data : []
    console.log('pin-login rpc result', { status, statusText, hasData: Boolean(data), isArray: Array.isArray(data), count: rows.length, error: error?.message ?? null })
    if (error) return new Response(JSON.stringify({ error: 'Не удалось проверить PIN' }), { status: 500, headers })
    if (rows.length === 0) return new Response(JSON.stringify({ error: 'Неверный PIN' }), { status: 401, headers })
    const row = rows[0]
    if (!row?.user_id || !row?.user_name || !row?.user_role) return new Response(JSON.stringify({ error: 'Сервис входа временно недоступен.' }), { status: 500, headers })
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = (now + 60 * 60 * 12) * 1000
    const token = await signJwt({
      sub: row.user_id,
      role: 'authenticated',
      pff_user_id: row.user_id,
      pff_role: row.user_role,
      name: row.user_name,
      aud: 'authenticated',
      iat: now,
      exp: Math.floor(expiresAt / 1000),
    }, jwtSecret)
    const id = row.user_name === 'Даня' ? 'danya' : row.user_name === 'Вика' ? 'vika' : row.user_id
    return new Response(JSON.stringify({ token, access_token: token, expiresAt, user: { id, dbId: row.user_id, name: row.user_name, role: row.user_role } }), { headers })
  } catch (error) {
    console.error(error); return new Response(JSON.stringify({ error: 'Сервис входа временно недоступен.' }), { status: 500, headers })
  }
})
