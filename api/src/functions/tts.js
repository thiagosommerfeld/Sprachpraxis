const { app } = require('@azure/functions');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

function authenticated(req) {
  try {
    const header = req.headers.get('x-ms-client-principal');
    const user = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf8')) : null;
    return Boolean(user?.userId && user.userRoles?.includes('authenticated'));
  } catch { return false; }
}

app.http('tts', {
  methods: ['GET'], authLevel: 'anonymous',
  handler: async (request, context) => {
    if (!authenticated(request)) return { status: 401, body: 'Entre para usar a voz Azure.' };
    const { SPEECH_KEY, SPEECH_REGION } = process.env;
    if (!SPEECH_KEY || !SPEECH_REGION) return { status: 500, body: 'Serviço de voz não configurado.' };
    const text = (request.query.get('text') || '').trim();
    if (!text) return { status: 400, body: 'Texto não fornecido.' };
    if (text.length > 350) return { status: 400, body: 'Limite de 350 caracteres.' };
    try {
      const config = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
      config.speechSynthesisVoiceName = 'de-DE-ConradNeural';
      const synthesizer = new sdk.SpeechSynthesizer(config, null);
      const audio = await new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(text, result => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) resolve(Buffer.from(result.audioData));
          else reject(new Error(result.errorDetails || 'Síntese falhou.'));
        }, error => { synthesizer.close(); reject(error); });
      });
      return { status: 200, headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=86400' }, body: audio };
    } catch (error) {
      context.error('Falha no Azure Speech:', error);
      return { status: 502, body: 'Não foi possível gerar o áudio.' };
    }
  }
});
