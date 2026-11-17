package com.kora.jarvis;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Pont entre l'interface web de Kora et les fonctions Android natives. */
@CapacitorPlugin(name = "KoraNative")
public class KoraNativePlugin extends Plugin {

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context c = getContext();
        JSObject o = new JSObject();
        o.put("notificationAccess", NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.getPackageName()));
        o.put("overlay", Settings.canDrawOverlays(c));
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        o.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        o.put("sms", granted(Manifest.permission.RECEIVE_SMS) && granted(Manifest.permission.SEND_SMS));
        o.put("notifications", Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS));
        o.put("serviceOn", KoraPrefs.serviceOn(c));
        o.put("overlayOn", KoraPrefs.overlayOn(c));
        call.resolve(o);
    }

    /** Reçoit l'adresse du serveur + le jeton de connexion ; démarre le service au premier lancement. */
    @PluginMethod
    public void configure(PluginCall call) {
        Context c = getContext();
        KoraPrefs.setAuth(c, call.getString("baseUrl", ""), call.getString("token", ""));
        if (!KoraPrefs.isConfigured(c)) {
            c.stopService(new Intent(c, KoraService.class));
        } else {
            if (!KoraPrefs.hasServicePref(c)) KoraPrefs.setServiceOn(c, true);
            if (KoraPrefs.serviceOn(c)) startService();
            if (Build.VERSION.SDK_INT >= 24) {
                try {
                    NotificationListenerService.requestRebind(new ComponentName(c, KoraNotificationListener.class));
                } catch (Throwable ignored) { }
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void openNotificationAccess(PluginCall call) {
        launch(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        call.resolve();
    }

    @PluginMethod
    public void requestOverlay(PluginCall call) {
        launch(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName())));
        call.resolve();
    }

    @PluginMethod
    public void requestBattery(PluginCall call) {
        launch(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName())));
        call.resolve();
    }

    @PluginMethod
    public void requestSms(PluginCall call) {
        ActivityCompat.requestPermissions(getActivity(), new String[]{
                Manifest.permission.RECEIVE_SMS, Manifest.permission.SEND_SMS,
                Manifest.permission.READ_CONTACTS}, 4242);
        call.resolve();
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4243);
        }
        call.resolve();
    }

    @PluginMethod
    public void setService(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        KoraPrefs.setServiceOn(getContext(), enabled);
        if (enabled) startService();
        else {
            KoraPrefs.setOverlayOn(getContext(), false);
            getContext().stopService(new Intent(getContext(), KoraService.class));
        }
        call.resolve();
    }

    @PluginMethod
    public void setOverlay(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        KoraPrefs.setOverlayOn(getContext(), enabled);
        if (enabled) KoraPrefs.setServiceOn(getContext(), true);
        startService(); // relance onStartCommand : la bulle est ajoutée ou retirée
        if (!enabled && !KoraPrefs.serviceOn(getContext())) getContext().stopService(new Intent(getContext(), KoraService.class));
        call.resolve();
    }

    private void startService() {
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), KoraService.class));
        } catch (Throwable ignored) { }
    }

    private void launch(Intent i) {
        try {
            getActivity().startActivity(i);
        } catch (Throwable t) {
            // Certains téléphones n'ont pas cet écran : on ouvre les infos de l'application.
            Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(fallback);
        }
    }
}
