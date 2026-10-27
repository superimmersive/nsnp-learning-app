package za.co.superimmersive.nsnp;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Draw under the system bars. The web app pads with env(safe-area-inset-*).
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
