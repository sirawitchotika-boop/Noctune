package com.noctune.player;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

/**
 * The Android media session mirrors the HTMLAudioElement; it never plays audio itself.
 * Notification, headset and audio-focus controls are routed back to the web player.
 */
@CapacitorPlugin(name = "NoctuneMedia")
public class NoctuneMediaPlugin extends Plugin {
    private static WeakReference<NoctuneMediaPlugin> listener = new WeakReference<>(null);

    @Override
    public void load() {
        listener = new WeakReference<>(this);
    }

    public static void sendCommand(String command, long positionMs) {
        NoctuneMediaPlugin plugin = listener.get();
        if (plugin == null) return;
        JSObject data = new JSObject();
        data.put("action", command);
        data.put("positionMs", positionMs);
        plugin.notifyListeners("command", data);
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        try {
            // Chromium's WebView media engine is the only Android audio-focus owner.
            // A second native request can preempt WebView playback and create a pause loop.
            NoctuneMediaService.begin(getContext());
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not start Android media controls.", error);
        }
    }

    @PluginMethod
    public void publish(PluginCall call) {
        try {
            NoctuneMediaService.Snapshot state = new NoctuneMediaService.Snapshot(
                call.getString("title", ""),
                call.getBoolean("playing", false),
                call.getBoolean("buffering", false),
                Math.max(0L, call.getDouble("positionMs", 0.0).longValue()),
                Math.max(0L, call.getDouble("durationMs", 0.0).longValue()),
                call.getLong("sequence", 0L),
                call.getBoolean("hasTrack", false)
            );
            NoctuneMediaService.publish(state);
            call.resolve();
        } catch (Exception error) {
            call.reject("Android media state could not be updated.", error);
        }
    }

    @PluginMethod
    public void setSleepDeadline(PluginCall call) {
        try {
            NoctuneMediaService.setSleepDeadline(
                getContext(),
                call.getDouble("deadlineMs", 0.0).longValue()
            );
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not set Android sleep timer.", error);
        }
    }

    @Override
    protected void handleOnDestroy() {
        listener.clear();
        // Noctune uses an HTML audio element, which dies with this WebView.
        // Avoid leaving a notification claiming playback survived its owner.
        NoctuneMediaService.end(getContext());
        super.handleOnDestroy();
    }
}
