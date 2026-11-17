package com.kora.jarvis;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/** Relance le service d'arrière-plan quand le téléphone démarre. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        if (KoraPrefs.isConfigured(context) && KoraPrefs.serviceOn(context)) {
            try {
                ContextCompat.startForegroundService(context, new Intent(context, KoraService.class));
            } catch (Throwable ignored) { }
        }
    }
}
