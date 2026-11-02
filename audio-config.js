// Current audio comes from a private Blob through the /api/audio endpoint.
// On a cache miss the app uses browser speech until Qwen audio is uploaded.
// Later, the same endpoint can synthesize a missing clip with Azure Speech,
// save it in the same Blob, and return it without changing the player.
window.SPRACHPAXIS_AUDIO_CONFIG = Object.freeze({
  provider: "blob-cache",
  audioEndpoint: "/api/audio"
});
