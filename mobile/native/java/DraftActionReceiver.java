package com.kora.jarvis;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

/** Bouton « Envoyer » de la notification de brouillon. */
public class DraftActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final Context ctx = context.getApplicationContext();
        final String id = intent.getStringExtra("id");
        if (id == null) return;
        NotificationManagerCompat.from(ctx).cancel(id.hashCode());
        final Responder.Pending p = Responder.PENDING.remove(id);
        if (p == null) {
            Toast.makeText(ctx, "Brouillon expiré : réponds depuis WhatsApp ou l'app Kora.", Toast.LENGTH_LONG).show();
            return;
        }
        Responder.EXEC.execute(() -> {
            try {
                Responder.sendNow(ctx, p);
                KoraApi.post(ctx, "/api/messages/" + id + "/envoye", new JSONObject());
            } catch (Throwable t) {
                Log.w("KoraDraft", "Envoi impossible : " + t.getMessage());
            }
        });
    }
}
