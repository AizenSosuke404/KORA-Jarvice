package com.kora.jarvis;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Appels vers le backend Kora (Render). Toujours à lancer hors du thread principal. */
final class KoraApi {
    private KoraApi() {}

    static JSONObject post(Context c, String path, JSONObject body) throws Exception {
        String base = KoraPrefs.baseUrl(c);
        String token = KoraPrefs.token(c);
        if (base.isEmpty() || token.isEmpty()) throw new IllegalStateException("Kora n'est pas connectée.");

        HttpURLConnection h = (HttpURLConnection) new URL(base + path).openConnection();
        try {
            h.setRequestMethod("POST");
            h.setConnectTimeout(30_000);
            h.setReadTimeout(75_000); // le plan gratuit de Render peut mettre ~1 min à se réveiller
            h.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            h.setRequestProperty("Authorization", "Bearer " + token);
            h.setDoOutput(true);
            try (OutputStream os = h.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = h.getResponseCode();
            String text = read(code < 400 ? h.getInputStream() : h.getErrorStream());
            if (code >= 400) throw new IOException("HTTP " + code + " " + text);
            return text.isEmpty() ? new JSONObject() : new JSONObject(text);
        } finally {
            h.disconnect();
        }
    }

    private static String read(InputStream in) throws IOException {
        if (in == null) return "";
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        }
    }
}
