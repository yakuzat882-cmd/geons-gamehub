const ALLOWED_ORIGIN = "https://yakuzat882-cmd.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...corsHeaders()
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return new Response("Geon AI Reader TTS", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          ...corsHeaders()
        }
      });
    }

    try {
      const body = await request.json();
      const text = String(body?.text || "").trim();

      if (!text) {
        return jsonResponse({ error: "Missing text" }, 400);
      }

      if (text.length > 2000) {
        return jsonResponse({ error: "Text is too long" }, 400);
      }

      const audio = await env.AI.run("@cf/deepgram/aura-2-en", {
        text,
        speaker: "luna",
        encoding: "mp3"
      });

      return new Response(audio, {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "cache-control": "no-store",
          ...corsHeaders()
        }
      });
    } catch (error) {
      return jsonResponse({
        error: "TTS generation failed",
        message: error?.message || "Unknown error"
      }, 500);
    }
  }
};
