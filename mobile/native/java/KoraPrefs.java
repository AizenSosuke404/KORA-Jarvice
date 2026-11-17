package com.kora.jarvis;

import android.content.Context;
import android.content.SharedPreferences;

/** Réglages lus par les services natifs (qui tournent même quand l'interface est fermée). */
final class KoraPrefs {
    private KoraPrefs() {}

    private static SharedPreferences p(Context c) {
        return c.getApplicationContext().getSharedPreferences("kora", Context.MODE_PRIVATE);
    }

    static String baseUrl(Context c) { return p(c).getString("baseUrl", ""); }
    static String token(Context c) { return p(c).getString("token", ""); }
    static boolean isConfigured(Context c) { return !baseUrl(c).isEmpty() && !token(c).isEmpty(); }

    static void setAuth(Context c, String baseUrl, String token) {
        String b = baseUrl == null ? "" : baseUrl.trim();
        while (b.endsWith("/")) b = b.substring(0, b.length() - 1);
        p(c).edit().putString("baseUrl", b).putString("token", token == null ? "" : token).apply();
    }

    static boolean hasServicePref(Context c) { return p(c).contains("serviceOn"); }
    static boolean serviceOn(Context c) { return p(c).getBoolean("serviceOn", false); }
    static void setServiceOn(Context c, boolean v) { p(c).edit().putBoolean("serviceOn", v).apply(); }
    static boolean overlayOn(Context c) { return p(c).getBoolean("overlayOn", false); }
    static void setOverlayOn(Context c, boolean v) { p(c).edit().putBoolean("overlayOn", v).apply(); }
}
