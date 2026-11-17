// Usage :
//   node scripts/setup.mjs config   → écrit l'adresse du serveur (KORA_URL) dans capacitor.config.json
//   node scripts/setup.mjs native   → après « cap add android » : copie le code natif et déclare permissions/services
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2];

if (mode === "config") {
  const file = path.join(root, "capacitor.config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  const url = (process.env.KORA_URL || cfg.server.url).trim().replace(/\/+$/, "");
  if (!/^https:\/\//.test(url)) throw new Error(`KORA_URL doit commencer par https:// (reçu : ${url})`);
  cfg.server.url = url;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  console.log("Serveur Kora :", url);
} else if (mode === "native") {
  const javaDir = path.join(root, "android/app/src/main/java/com/kora/jarvis");
  if (!fs.existsSync(javaDir)) throw new Error(`Dossier introuvable : ${javaDir} (lance d'abord « npx cap add android »)`);
  const src = path.join(root, "native/java");
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(javaDir, f));

  const manifestFile = path.join(root, "android/app/src/main/AndroidManifest.xml");
  let m = fs.readFileSync(manifestFile, "utf8");
  if (!m.includes("KoraNotificationListener")) {
    const permissions = [
      "POST_NOTIFICATIONS", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_SPECIAL_USE", "SYSTEM_ALERT_WINDOW",
      "RECEIVE_BOOT_COMPLETED", "RECEIVE_SMS", "SEND_SMS", "READ_CONTACTS", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", "WAKE_LOCK",
    ].map((p) => `    <uses-permission android:name="android.permission.${p}" />`).join("\n");

    const components = `
        <service
            android:name=".KoraNotificationListener"
            android:label="Kora"
            android:exported="true"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <service
            android:name=".KoraService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Assistant personnel : surveille les messages reçus et répond à la place de l'utilisateur" />
        </service>

        <receiver
            android:name=".SmsReceiver"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

        <receiver android:name=".DraftActionReceiver" android:exported="false" />
`;
    if (!m.includes("<application")) throw new Error("AndroidManifest.xml inattendu : balise <application> absente");
    m = m.replace("<application", `${permissions}\n\n    <application`);
    m = m.replace("</application>", `${components}    </application>`);
    fs.writeFileSync(manifestFile, m);
  }
  console.log("Code natif Kora installé dans le projet Android.");
} else {
  console.error("Usage : node scripts/setup.mjs config|native");
  process.exit(1);
}
