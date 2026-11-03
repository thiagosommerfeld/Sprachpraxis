// Audio is streamed through the Function App, which reads the private Blob.
// If a clip has not been uploaded yet, the app falls back to browser speech.
// The endpoint can later generate and cache missing clips with Azure Speech.
const apiBaseUrl = window.SPRACHPAXIS_CONFIG?.apiBaseUrl?.replace(/\/+$/, '') || '';
window.SPRACHPAXIS_AUDIO_CONFIG = Object.freeze({
  provider: 'blob-cache',
  audioEndpoint: apiBaseUrl ? `${apiBaseUrl}/audio` : ''
});
