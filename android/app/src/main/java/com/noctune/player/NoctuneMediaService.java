package com.noctune.player;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

/**
 * Android-facing media controls only. HTMLAudioElement is the playback authority.
 * The service must not independently move tracks, seek or resume.
 */
public class NoctuneMediaService extends Service {
    private static final String CHANNEL_ID = "noctune_playback";
    private static final int NOTIFICATION_ID = 4201;
    private static final String CONTROL_ACTION = "com.noctune.player.CONTROL";
    private static final String CONTROL_NAME = "control";
    private static final String TIMER_ACTION = "com.noctune.player.SLEEP_EXPIRED";
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private static NoctuneMediaService instance;
    private static Snapshot lastSnapshot;
    private static AudioManager audioManager;
    private static AudioFocusRequest focusRequest;
    private static boolean focusHeld;

    private MediaSession session;
    private NotificationManager notifications;
    private boolean playing;
    private boolean hasTrack;
    private boolean foreground;
    private long sequence = -1;
    private long lastPositionUpdateElapsed;

    public static final class Snapshot {
        final String title;
        final boolean playing;
        final boolean buffering;
        final long positionMs;
        final long durationMs;
        final long sequence;
        final boolean hasTrack;

        public Snapshot(String title, boolean playing, boolean buffering, long positionMs,
                        long durationMs, long sequence, boolean hasTrack) {
            this.title = title == null ? "" : title;
            this.playing = playing;
            this.buffering = buffering;
            this.positionMs = Math.max(0, positionMs);
            this.durationMs = Math.max(0, durationMs);
            this.sequence = sequence;
            this.hasTrack = hasTrack;
        }
    }

    private static final AudioManager.OnAudioFocusChangeListener FOCUS_LISTENER = change -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS ||
            change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
            change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            MAIN.post(() -> {
                if (instance != null && instance.playing) instance.requestPause();
            });
        }
        // Never auto-resume after a route or focus change.
    };

    public static synchronized boolean acquireAudioFocus(Context context) {
        if (focusHeld) return true;
        if (audioManager == null) {
            audioManager = (AudioManager) context.getApplicationContext().getSystemService(Context.AUDIO_SERVICE);
        }
        if (audioManager == null) return false;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(FOCUS_LISTENER)
                    .build();
            }
            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result = audioManager.requestAudioFocus(
                FOCUS_LISTENER, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN
            );
        }
        focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        return focusHeld;
    }

    public static synchronized void releaseAudioFocus() {
        if (!focusHeld || audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(FOCUS_LISTENER);
        }
        focusHeld = false;
    }

    public static void begin(Context context) {
        Intent intent = new Intent(context, NoctuneMediaService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void end(Context context) {
        lastSnapshot = null;
        releaseAudioFocus();
        context.stopService(new Intent(context, NoctuneMediaService.class));
    }

    public static void publish(Snapshot snapshot) {
        MAIN.post(() -> {
            if (lastSnapshot != null && snapshot.sequence <= lastSnapshot.sequence) return;
            lastSnapshot = snapshot;
            if (instance != null) instance.accept(snapshot);
        });
    }

    public static void setSleepDeadline(Context context, long epochMs) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, NoctuneTimerReceiver.class);
        intent.setAction(TIMER_ACTION);
        PendingIntent pending = PendingIntent.getBroadcast(
            context, 504, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.cancel(pending);
        if (epochMs <= System.currentTimeMillis()) return;
        // No exact-alarm special permission. Android may delay while idle;
        // the JS wall-clock deadline remains the source of the displayed timer.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, epochMs, pending);
    }

    public static void timerExpired() {
        MAIN.post(() -> {
            if (instance != null && instance.playing) instance.requestPause();
        });
    }

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())
                && playing) requestPause();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        notifications = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Music playback", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controls for music playing in Noctune");
            channel.setSound(null, null);
            notifications.createNotificationChannel(channel);
        }

        session = new MediaSession(this, "NoctuneMedia");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { command("play", 0); }
            @Override public void onPause() { requestPause(); }
            @Override public void onStop() { requestPause(); }
            @Override public void onSkipToNext() { command("next", 0); }
            @Override public void onSkipToPrevious() { command("previous", 0); }
            @Override public void onSeekTo(long position) { command("seek", position); }
        });
        session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setActive(true);

        IntentFilter routes = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(noisyReceiver, routes, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(noisyReceiver, routes);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!foreground) {
            Notification preparing = notification();
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(
                    NOTIFICATION_ID, preparing, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, preparing);
            }
            foreground = true;
        }

        if (intent != null && CONTROL_ACTION.equals(intent.getAction())) {
            String action = intent.getStringExtra(CONTROL_NAME);
            if ("pause".equals(action)) requestPause();
            else command(action, 0);
        }
        if (lastSnapshot != null) accept(lastSnapshot);
        return START_NOT_STICKY;
    }

    private void requestPause() {
        // Immediately hold the Android timeline still. The WebView confirms the
        // actual pause and publishes the final real position.
        if (!playing) return;
        long position = lastSnapshot == null ? 0 : lastSnapshot.positionMs;
        if (lastSnapshot != null && lastPositionUpdateElapsed > 0) {
            position += Math.max(0, SystemClock.elapsedRealtime() - lastPositionUpdateElapsed);
            if (lastSnapshot.durationMs > 0) {
                position = Math.min(position, lastSnapshot.durationMs);
            }
        }
        playing = false;
        showState(PlaybackState.STATE_PAUSED, position, false);
        notifications.notify(NOTIFICATION_ID, notification());
        releaseAudioFocus();
        command("pause", 0);
    }

    private void command(String action, long positionMs) {
        if (action == null) return;
        NoctuneMediaPlugin.sendCommand(action, positionMs);
    }

    private void accept(Snapshot state) {
        if (state.sequence < sequence) return;
        sequence = state.sequence;
        lastPositionUpdateElapsed = SystemClock.elapsedRealtime();
        hasTrack = state.hasTrack;
        playing = state.playing && !state.buffering;
        if (!state.hasTrack) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return;
        }
        session.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, state.title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, "Noctune · Offline music")
            .putLong(MediaMetadata.METADATA_KEY_DURATION, state.durationMs).build());

        int status = state.buffering
            ? PlaybackState.STATE_BUFFERING
            : state.playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        showState(status, state.positionMs, state.playing && !state.buffering);
        notifications.notify(NOTIFICATION_ID, notification());
    }

    private void showState(int state, long positionMs, boolean moving) {
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE |
            PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT |
            PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO;
        session.setPlaybackState(new PlaybackState.Builder()
            .setActions(actions)
            .setState(state, Math.max(0L, positionMs),
                moving ? 1.0f : 0.0f, SystemClock.elapsedRealtime())
            .build());
    }

    private PendingIntent control(String action, int requestCode) {
        Intent intent = new Intent(this, NoctuneMediaService.class);
        intent.setAction(CONTROL_ACTION);
        intent.putExtra(CONTROL_NAME, action);
        return PendingIntent.getService(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification notification() {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Action previous = new Notification.Action.Builder(
            android.R.drawable.ic_media_previous, "Previous", control("previous", 1)).build();
        Notification.Action toggle = new Notification.Action.Builder(
            playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            playing ? "Pause" : "Play", control(playing ? "pause" : "play", 2)).build();
        Notification.Action next = new Notification.Action.Builder(
            android.R.drawable.ic_media_next, "Next", control("next", 3)).build();

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        return builder
            .setSmallIcon(R.drawable.ic_noctune_notification)
            .setContentTitle(lastSnapshot == null || !lastSnapshot.hasTrack
                ? "Preparing Noctune" : lastSnapshot.title)
            .setContentText(playing ? "Playing locally" : "Paused")
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setContentIntent(content)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .addAction(previous)
            .addAction(toggle)
            .addAction(next)
            .setStyle(new Notification.MediaStyle()
                .setMediaSession(session.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2))
            .build();
    }

    @Override
    public void onDestroy() {
        try { unregisterReceiver(noisyReceiver); } catch (IllegalArgumentException ignored) { }
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        if (instance == this) instance = null;
        foreground = false;
        releaseAudioFocus();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
