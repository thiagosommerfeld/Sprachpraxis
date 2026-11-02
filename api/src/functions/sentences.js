const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const crypto = require('crypto');

const client = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
const container = client.database('SprachpraxisDB').container('Sentences');

function rolesFrom(req) {
  try {
    const header = req.headers.get('x-ms-client-principal');
    return header ? JSON.parse(Buffer.from(header, 'base64').toString('utf8')).userRoles || [] : [];
  } catch { return []; }
}

function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'Item deve ser um objeto.';
  const { de, pt = '', topic } = raw;
  if (typeof de !== 'string' || !de.trim() || typeof pt !== 'string' || typeof topic !== 'string' || !topic.trim()) return 'de e topic são obrigatórios; pt deve ser texto.';
  if (de.trim().length > 350 || pt.trim().length > 350 || topic.trim().length > 80) return 'Limite excedido: frases 350 caracteres; tema 80.';
  return null;
}

app.http('sentences', {
  methods: ['GET', 'POST'], authLevel: 'anonymous',
  handler: async (request, context) => {
    if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) return { status: 500, body: 'Banco não configurado.' };
    try {
      if (request.method === 'GET') {
        const { resources } = await container.items.query('SELECT c.id, c.de, c.pt, c.topic FROM c').fetchAll();
        return { status: 200, jsonBody: resources };
      }
      if (!rolesFrom(request).includes('administrator')) return { status: 403, body: 'Acesso restrito à administração.' };
      let payload;
      try { payload = await request.json(); } catch { return { status: 400, body: 'JSON inválido.' }; }
      const batch = Array.isArray(payload) ? payload : [payload];
      if (!batch.length || batch.length > 500) return { status: 400, body: 'Envie de 1 a 500 frases por lote.' };
      const validated = [];
      for (let i = 0; i < batch.length; i++) {
        const error = validate(batch[i]);
        if (error) return { status: 400, body: `Item ${i + 1}: ${error}` };
        const id = typeof batch[i].id === 'string' && /^[a-zA-Z0-9_-]{2,64}$/.test(batch[i].id) ? batch[i].id : `s-${crypto.randomUUID()}`;
        validated.push({ id, de: batch[i].de.trim(), pt: (batch[i].pt || '').trim(), topic: batch[i].topic.trim() });
      }
      for (let i = 0; i < validated.length; i += 10) {
        await Promise.all(validated.slice(i, i + 10).map(item => container.items.upsert(item)));
      }
      return { status: 201, jsonBody: Array.isArray(payload) ? { imported: validated.length } : validated[0] };
    } catch (error) {
      context.error('Falha na API de frases:', error);
      return { status: 500, body: 'Erro ao acessar o banco de frases.' };
    }
  }
});
