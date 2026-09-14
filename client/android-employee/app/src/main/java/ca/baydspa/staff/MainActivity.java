package ca.baydspa.staff;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the local Square Tap to Pay plugin before the bridge loads.
        registerPlugin(SquarePosPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
