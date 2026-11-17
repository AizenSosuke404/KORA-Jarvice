package com.kora.jarvis;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;

/** Cœur du « répondre à ma place » : demande la réponse à l'IA puis l'envoie (ou la propose en brouillon). */
final class Responder {
    private static final String TAG = "KoraResponder";
    static final String CHANNEL_DRAFTS = "kora_drafts";
    static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    /** Réponse en attente de validation (brouillon). Gardée en mémoire seulement. */
    static final class Pending {
        final String appli;                 // "whatsapp" ou "sms"
        final Notification.Action action;   // WhatsApp : action « Répondre » de la notification
        final String phone;                 // SMS : numéro
        final String reply;
        Pending(String appli, Notification.Action action, String phone, String reply) {
            this.appli = appli; this.action = action; this.phone = phone; this.reply = reply;
        }
    }

    static final Map<String, Pending> PENDING = new ConcurrentHashMap<>();

    // Réponses qu'on vient d'envoyer : évite de répondre à notre propre message si WhatsApp le republie.
    private static final Map<String, Long> SENT = new LinkedHashMap<>();
    // Messages déjà traités (clé + texte) : évite les doublons quand une notification est mise à jour.
    private static final Map<String, Long> SEEN = new HashMap<>();

    static synchronized boolean alreadySeen(String key) {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, Long>> it = SEEN.entrySet().iterator();
        while (it.hasNext()) if (now - it.next().getValue() > 10 * 60_000L) it.remove();
        if (SEEN.containsKey(key)) return true;
        SEEN.put(key, now);
        return false;
    }

    static synchronized boolean isOwnReply(String text) {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, Long>> it = SENT.entrySet().iterator();
        while (it.hasNext()) if (now - it.next().getValue() > 10 * 60_000L) it.remove();
        return SENT.containsKey(norm(text));
    }

    private static synchronized void markSent(String text) { SENT.put(norm(text), System.currentTimeMillis()); }

    private static String norm(String s) { return s == null ? "" : s.trim().toLowerCase(); }

    /** Traite un message reçu. À appeler depuis EXEC (réseau). */
    static void handleIncoming(Context ctx, String contact, String appli, String recu, Notification.Action action, String phone) {
        try {
            JSONObject body = new JSONObject();
            body.put("contact", contact);
            body.put("appli", appli);
            body.put("recu", recu);
            JSONObject r = KoraApi.post(ctx, "/api/incoming", body);
            String what = r.optString("action", "ignore");
            String reply = r.optString("reponse", "");
            String id = r.optString("id", "");
            if (reply.isEmpty() || "ignore".equals(what)) return;

            Pending p = new Pending(appli, action, phone, reply);
            if ("send".equals(what)) {
                // Petite pause pour ne pas répondre à la milliseconde, comme un humain.
                Thread.sleep(ThreadLocalRandom.current().nextLong(2000, 5000));
                sendNow(ctx, p);
            } else if ("draft".equals(what) && !id.isEmpty()) {
                PENDING.put(id, p);
                showDraft(ctx, id, contact, reply);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Échec du traitement : " + t.getMessage());
        }
    }

    static void sendNow(Context ctx, Pending p) throws Exception {
        markSent(p.reply);
        if ("sms".equals(p.appli)) {
            SmsManager sm = Build.VERSION.SDK_INT >= 31 ? ctx.getSystemService(SmsManager.class) : SmsManager.getDefault();
            ArrayList<String> parts = sm.divideMessage(p.reply);
            sm.sendMultipartTextMessage(p.phone, null, parts, null, null);
            return;
        }
        RemoteInput[] inputs = p.action.getRemoteInputs();
        if (inputs == null || inputs.length == 0) throw new IllegalStateException("Pas de champ de réponse.");
        Bundle results = new Bundle();
        for (RemoteInput ri : inputs) results.putCharSequence(ri.getResultKey(), p.reply);
        Intent intent = new Intent();
        RemoteInput.addResultsToIntent(inputs, intent, results);
        p.action.actionIntent.send(ctx, 0, intent);
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL_DRAFTS) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL_DRAFTS, "Brouillons à valider", NotificationManager.IMPORTANCE_HIGH));
        }
    }

    private static void showDraft(Context ctx, String id, String contact, String reply) {
        ensureChannel(ctx);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent send = PendingIntent.getBroadcast(ctx, id.hashCode(),
                new Intent(ctx, DraftActionReceiver.class).putExtra("id", id), flags);
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(ctx, 0, launch, flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_DRAFTS)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle("Kora — brouillon pour " + contact)
                .setContentText(reply)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(reply))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(0, "Envoyer", send);
        if (open != null) b.setContentIntent(open);
        try {
            NotificationManagerCompat.from(ctx).notify(id.hashCode(), b.build());
        } catch (SecurityException e) {
            Log.w(TAG, "Notifications non autorisées");
        }
    }
}
