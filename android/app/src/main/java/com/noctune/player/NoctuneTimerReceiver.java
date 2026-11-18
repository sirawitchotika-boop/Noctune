package com.noctune.player;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarm delivery is best-effort; the playback authority remains in the WebView. */
public class NoctuneTimerReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if ("com.noctune.player.SLEEP_EXPIRED".equals(intent.getAction())) {
            NoctuneMediaService.timerExpired();
        }
    }
}
