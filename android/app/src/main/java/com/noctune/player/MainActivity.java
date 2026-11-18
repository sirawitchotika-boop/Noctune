package com.noctune.player;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** Keep the native bridge small; the web audio controller remains the player. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NoctuneMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
