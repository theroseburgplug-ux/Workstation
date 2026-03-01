export const DEFAULT_VOICE_WORKER_BASE = "https://trp-voice-worker.theroseburgplug.workers.dev";

export function getVoiceWorkerBase() {
  try {
    if (typeof window !== 'undefined') {
      const v = window.localStorage.getItem('VOICE_WORKER_BASE_URL');
      return v && v.length ? v : DEFAULT_VOICE_WORKER_BASE;
    }
  } catch (e) {}
  return DEFAULT_VOICE_WORKER_BASE;
}
