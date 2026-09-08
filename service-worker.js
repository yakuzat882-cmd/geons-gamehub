const CACHE_VERSION = "proudgeonquiz-v6-2026-09-08-ai-reader";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./src/gameCore.js",
  "./src/state/storage.js",
  "./src/data/questionValidator.js",
  "./src/quiz/scoring.js",
  "./src/progression/streaks.js",
  "./src/data/dailyChallenge.js",
  "./src/audio/audioManager.js",
  "./src/accessibility/reader.js",
  "./src/story/storyData.js",
  "./src/story/storyQuiz.js",
  "./src/mission/missionData.js",
  "./src/mission/mission.js",
  "./questions.embedded.js",
  "./questions.new.embedded.js",
  "./questions.json",
  "./questions.new.json",
  "./click.mp3",
  "./correct.mp3",
  "./wrong.mp3",
  "./motto-music.mp3",
  "./home-music.mp3",
  "./game-music.mp3",
  "./victory.mp3",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./favicon.svg",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

async function shellIsCached() {
  const cache = await caches.open(CACHE_VERSION);
  const entries = await Promise.all(SHELL.map(path => cache.match(path)));
  return entries.every(Boolean);
}

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
      .then(async () => {
        if (!await shellIsCached()) return;
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: "OFFLINE_READY", cacheVersion: CACHE_VERSION }));
      })
  );
});

async function cacheJsonSafely(request, response) {
  if (!response || !response.ok) return;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("json")) return;
  try {
    const clone = response.clone();
    await clone.json();
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response);
  } catch (error) {
    // Never cache malformed JSON.
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (url.pathname.endsWith(".json")) {
        await cacheJsonSafely(request, response);
      } else {
        const cache = await caches.open(CACHE_VERSION);
        if (response.ok && (url.origin === location.origin)) {
          cache.put(request, response.clone()).catch(() => {});
        }
      }
      return response;
    } catch (error) {
      const fallback = await caches.match("./index.html");
      return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "PING") {
    event.waitUntil(
      shellIsCached().then(ready => {
        if (ready) event.source?.postMessage({ type: "OFFLINE_READY", cacheVersion: CACHE_VERSION });
      })
    );
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(caches.delete(CACHE_VERSION));
  }
});
