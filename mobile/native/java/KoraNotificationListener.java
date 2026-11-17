package com.kora.jarvis;

import android.app.Notification;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.Locale;
import java.util.regex.Pattern;

/** Voit arriver les notifications WhatsApp (conversations privées) et déclenche la réponse de Kora. */
public class KoraNotificationListener extends NotificationListenerService {
    private static final String TAG = "KoraListener";
    private static final Pattern SUMMARY = Pattern.compile("^\\d+\\s+(nouveaux?\\s+|new\\s+)?(messages?|conversations?).*", Pattern.CASE_INSENSITIVE);

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            handle(sbn);
        } catch (Throwable t) {
            Log.w(TAG, "Notification ignorée : " + t.getMessage());
        }
    }

    private void handle(StatusBarNotification sbn) {
        String pkg = sbn.getPackageName();
        if (!"com.whatsapp".equals(pkg) && !"com.whatsapp.w4b".equals(pkg)) return;
        if (!KoraPrefs.isConfigured(this)) return;

        Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return;
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        Bundle ex = n.extras;
        // Jamais de réponse automatique dans les groupes.
        if (ex.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)) return;
        if (ex.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE) != null) return;

        String title = str(ex.getCharSequence(Notification.EXTRA_TITLE));
        String text = lastMessage(ex);
        if (title.isEmpty() || text.isEmpty() || "WhatsApp".equalsIgnoreCase(title)) return;
        if (!isRealMessage(text)) return;
        if (Responder.isOwnReply(text)) return;

        Notification.Action reply = findReplyAction(n);
        if (reply == null) return;

        if (Responder.alreadySeen(sbn.getKey() + "|" + text)) return;

        final String contact = title;
        final String recu = text;
        Responder.EXEC.execute(() -> Responder.handleIncoming(getApplicationContext(), contact, "whatsapp", recu, reply, null));
    }

    private static String lastMessage(Bundle ex) {
        Parcelable[] msgs = ex.getParcelableArray(Notification.EXTRA_MESSAGES);
        if (msgs != null && msgs.length > 0 && msgs[msgs.length - 1] instanceof Bundle) {
            String t = str(((Bundle) msgs[msgs.length - 1]).getCharSequence("text"));
            if (!t.isEmpty()) return t;
        }
        return str(ex.getCharSequence(Notification.EXTRA_TEXT));
    }

    /** Exclut les appels, médias, résumés « 3 nouveaux messages »… : seuls les vrais textes reçoivent une réponse. */
    private static boolean isRealMessage(String text) {
        if (SUMMARY.matcher(text).matches()) return false;
        String l = text.toLowerCase(Locale.ROOT);
        String[] skip = {"📷", "🎥", "🎤", "🎵", "🎧", "📎", "📄", "📞", "📹", "photo", "vidéo", "video", "message vocal", "voice message",
                "audio", "sticker", "gif", "appel", "call", "missed", "document", "contact", "localisation", "location"};
        for (String s : skip) if (l.startsWith(s)) return false;
        return true;
    }

    private static Notification.Action findReplyAction(Notification n) {
        if (n.actions == null) return null;
        Notification.Action fallback = null;
        for (Notification.Action a : n.actions) {
            if (a == null || a.getRemoteInputs() == null || a.getRemoteInputs().length == 0 || a.actionIntent == null) continue;
            if (Build.VERSION.SDK_INT >= 28 && a.getSemanticAction() == Notification.Action.SEMANTIC_ACTION_REPLY) return a;
            if (fallback == null) fallback = a;
        }
        return fallback;
    }

    private static String str(CharSequence c) { return c == null ? "" : c.toString().trim(); }
}
