const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
const container = client.database('SprachpraxisDB').container('Progress');

function principal(req) {
  try {
    const header = req.headers.get('x-ms-client-principal');
    return header ? JSON.parse(Buffer.from(header, 'base64').toString('utf8')) : null;
  } catch { return null; }
}
function mergeMap(a = {}, b = {}) {
  const out = {};
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (key.length > 64) continue;
    const value = Math.max(Number(a?.[key]) || 0, Number(b?.[key]) || 0);
    if (Number.isFinite(value) && value > 0) out[key] = value;
  }
  return out;
}
function mergeRatings(a = {}, b = {}) {
  const out = {};
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (key.length > 64) continue;
    const previous = a?.[key], incoming = b?.[key];
    const prev = typeof previous === 'object' && previous ? previous : { value: Number(previous) || 0, updatedAt: '' };
    const next = typeof incoming === 'object' && incoming ? incoming : { value: Number(incoming) || 0, updatedAt: '' };
    const prevTime = Date.parse(prev.updatedAt || '') || 0, nextTime = Date.parse(next.updatedAt || '') || 0;
    const selected = incoming === undefined ? prev : (nextTime >= prevTime ? next : prev);
    out[key] = { value: Math.max(0, Math.min(5, Math.round(Number(selected.value) || 0))), updatedAt: selected.updatedAt || '' };
  }
  return out;
}
function empty(id) { return { id, userId: id, reps: {}, reviews: {}, ratings: {}, spoken: 0, audioSeconds: 0 }; }

app.http('progress', {
  methods: ['GET', 'POST'], authLevel: 'anonymous',
  handler: async (request, context) => {
    if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) return { status: 500, body: 'Banco não configurado.' };
    const user = principal(request);
    if (!user?.userId || !user.userRoles?.includes('authenticated')) return { status: 401, body: 'Autenticação necessária.' };
    const userId = user.userId;
    try {
      if (request.method === 'GET') {
        try { const { resource } = await container.item(userId, userId).read(); return { status: 200, jsonBody: resource || empty(userId) }; }
        catch (error) { if (error.code === 404) return { status: 200, jsonBody: empty(userId) }; throw error; }
      }
      let incoming;
      try { incoming = await request.json(); } catch { return { status: 400, body: 'JSON inválido.' }; }
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return { status: 400, body: 'Progresso inválido.' };
      let current = empty(userId);
      try { const { resource } = await container.item(userId, userId).read(); if (resource) current = resource; }
      catch (error) { if (error.code !== 404) throw error; }
      const merged = {
        ...empty(userId), reps: mergeMap(current.reps, incoming.reps), reviews: mergeMap(current.reviews, incoming.reviews), ratings: mergeRatings(current.ratings, incoming.ratings),
        spoken: Math.max(Number(current.spoken) || 0, Number(incoming.spoken) || 0),
        audioSeconds: Math.max(Number(current.audioSeconds) || 0, Number(incoming.audioSeconds) || 0),
        updatedAt: new Date().toISOString()
      };
      await container.items.upsert(merged);
      return { status: 200, jsonBody: merged };
    } catch (error) {
      context.error('Falha na API de progresso:', error);
      return { status: 500, body: 'Erro ao sincronizar progresso.' };
    }
  }
});
