package com.kora.jarvis;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.core.content.ContextCompat;

import java.util.LinkedHashMap;
import java.util.Map;

/** Reçoit les SMS et demande à Kora d'y répondre. */
public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        final Context ctx = context.getApplicationContext();
        if (!KoraPrefs.isConfigured(ctx)) return;
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) return;

        SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (msgs == null || msgs.length == 0) return;
        // Un SMS long arrive en plusieurs morceaux : on les recolle par expéditeur.
        Map<String, StringBuilder> bySender = new LinkedHashMap<>();
        for (SmsMessage m : msgs) {
            if (m == null || m.getOriginatingAddress() == null) continue;
            StringBuilder sb = bySender.get(m.getOriginatingAddress());
            if (sb == null) { sb = new StringBuilder(); bySender.put(m.getOriginatingAddress(), sb); }
            sb.append(m.getMessageBody() == null ? "" : m.getMessageBody());
        }
        for (Map.Entry<String, StringBuilder> e : bySender.entrySet()) {
            final String number = e.getKey();
            final String text = e.getValue().toString().trim();
            // Numéros alphanumériques (banques, opérateurs) : on ne répond jamais.
            if (text.isEmpty() || !number.matches("^\\+?[0-9 ]{5,}$")) continue;
            Responder.EXEC.execute(() -> {
                String name = lookupName(ctx, number);
                Responder.handleIncoming(ctx, name, "sms", text, null, number);
            });
        }
    }

    private static String lookupName(Context ctx, String number) {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return number;
        Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
        try (Cursor c = ctx.getContentResolver().query(uri, new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null && !c.getString(0).isEmpty()) return c.getString(0);
        } catch (Throwable ignored) { }
        return number;
    }
}
