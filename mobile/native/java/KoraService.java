package com.kora.jarvis;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

/**
 * Service d'avant-plan : garde Kora vivante en arrière-plan (notification discrète)
 * et affiche, si activée, la bulle flottante par-dessus les autres applis.
 */
public class KoraService extends Service {
    private static final String CHANNEL = "kora_service";
    private static final int NOTIF_ID = 1;

    private WindowManager wm;
    private View bubble;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startAsForeground();
        refreshBubble();
        return START_STICKY;
    }

    private void startAsForeground() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Kora en arrière-plan", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = launch == null ? null
                : PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle("Kora est active")
                .setContentText("Je surveille tes messages et je réponds à ta place.")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);
        if (open != null) b.setContentIntent(open);
        Notification n = b.build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ID, n);
        }
    }

    private void refreshBubble() {
        removeBubble();
        if (KoraPrefs.overlayOn(this) && Settings.canDrawOverlays(this)) addBubble();
    }

    private void addBubble() {
        wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        float d = getResources().getDisplayMetrics().density;
        int size = (int) (56 * d);

        TextView v = new TextView(this);
        v.setText("K");
        v.setTextColor(Color.parseColor("#031018"));
        v.setTextSize(22);
        v.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Color.parseColor("#00D4FF"), Color.parseColor("#0095FF")});
        bg.setShape(GradientDrawable.OVAL);
        v.setBackground(bg);
        v.setElevation(8 * d);

        final WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                size, size,
                Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 0;
        lp.y = (int) (220 * d);

        v.setOnTouchListener(new View.OnTouchListener() {
            private int startX, startY;
            private float touchX, touchY;
            private boolean moved;

            @Override
            public boolean onTouch(View view, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        startX = lp.x; startY = lp.y; touchX = e.getRawX(); touchY = e.getRawY(); moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - touchX, dy = e.getRawY() - touchY;
                        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) moved = true;
                        lp.x = startX + (int) dx;
                        lp.y = startY + (int) dy;
                        try { wm.updateViewLayout(view, lp); } catch (Throwable ignored) { }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) openApp();
                        return true;
                    default:
                        return false;
                }
            }
        });
        try {
            wm.addView(v, lp);
            bubble = v;
        } catch (Throwable ignored) { }
    }

    private void openApp() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(launch);
    }

    private void removeBubble() {
        if (bubble != null && wm != null) {
            try { wm.removeView(bubble); } catch (Throwable ignored) { }
        }
        bubble = null;
    }

    @Override
    public void onDestroy() {
        removeBubble();
        super.onDestroy();
    }
}
