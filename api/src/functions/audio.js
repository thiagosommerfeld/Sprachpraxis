const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const AUDIO_ID_PATTERN = /^[a-zA-Z0-9_-]{2,80}$/;

app.http('audio', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const id = (request.query.get('id') || '').trim();
    if (!AUDIO_ID_PATTERN.test(id)) {
      return { status: 400, body: 'ID de frase inválido.' };
    }

    const connectionString = process.env.AUDIO_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return { status: 503, body: 'Armazenamento de áudio não configurado.' };
    }

    const containerName = process.env.AUDIO_BLOB_CONTAINER || 'phrase-audio';

    try {
      const service = BlobServiceClient.fromConnectionString(connectionString);
      const blob = service.getContainerClient(containerName).getBlobClient(`${id}.mp3`);
      const audio = await blob.downloadToBuffer();

      return {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff'
        },
        body: audio
      };
    } catch (error) {
      if (error.statusCode === 404 || error.code === 'BlobNotFound' || error.code === 'ContainerNotFound') {
        return { status: 404, body: 'Áudio ainda não foi enviado.' };
      }
      context.error('Falha ao carregar áudio do Blob:', error);
      return { status: 503, body: 'Não foi possível carregar o áudio.' };
    }
  }
});
