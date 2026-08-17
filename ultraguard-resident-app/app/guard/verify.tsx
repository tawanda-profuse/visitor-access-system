import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAppTheme } from "@/theme/ThemeContext";
import { verifyGatePass } from "@/api/guard";
import { ApiClientError, describeError } from "@/api/client";
import type { GuardResultCode, GuardVerifyResult } from "@/api/types";

type Mode = "scan" | "manual";

const DENIAL_COPY: Partial<Record<GuardResultCode, string>> = {
  NOT_FOUND: "Code not recognized",
  WRONG_LOCATION: "This pass is not valid at this gate",
  REVOKED: "This pass was revoked",
  USED: "This pass has already been used",
  EXPIRED: "This pass has expired",
};

function denialCopy(result: GuardVerifyResult): string {
  return DENIAL_COPY[result.resultCode] ?? result.message;
}

export default function GuardVerifyScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { gateId, gateName, propertyName } = useLocalSearchParams<{
    gateId: string;
    gateName: string;
    propertyName: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("scan");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GuardVerifyResult | null>(null);
  const scanLockRef = useRef(false);

  const resetScan = () => {
    scanLockRef.current = false;
    setResult(null);
    setSubmitError(null);
    setPin("");
  };

  const selectMode = (next: Mode) => {
    if (next === mode) return;
    resetScan();
    setMode(next);
  };

  const runVerify = async (input: string, method: "PIN" | "QR") => {
    if (!gateId) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await verifyGatePass(gateId, input, method);
      setResult(res);
    } catch (e) {
      scanLockRef.current = false; // allow an immediate retry — the QR may still be in frame
      if (e instanceof ApiClientError && e.status === 429) {
        setSubmitError("Too many attempts — please wait a moment and try again.");
      } else {
        setSubmitError(describeError(e, "Couldn't verify the pass. Try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = (scanResult: { data: string }) => {
    if (scanLockRef.current || loading || result) return;
    scanLockRef.current = true;
    runVerify(scanResult.data, "QR");
  };

  const onSubmitPin = () => {
    if (!pin.trim()) {
      setSubmitError("Enter the PIN shown on the visitor's pass.");
      return;
    }
    runVerify(pin.trim(), "PIN");
  };

  return (
    <ScreenContainer scroll={mode === "manual" || !!result} style={{ gap: 16 }}>
      <Card style={{ gap: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Verifying at</Text>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
          {gateName} · {propertyName}
        </Text>
        <Pressable onPress={() => router.replace("/guard")}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 4 }}>
            Change Gate
          </Text>
        </Pressable>
      </Card>

      {!result && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["scan", "manual"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => selectMode(m)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: mode === m ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: mode === m ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: mode === m ? colors.textOnPrimary : colors.text,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {m === "scan" ? "Scan QR" : "Enter PIN"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {result ? (
        <ResultCard result={result} onScanNext={resetScan} />
      ) : mode === "scan" ? (
        <ScanPanel
          permission={permission}
          requestPermission={requestPermission}
          onBarcodeScanned={onBarcodeScanned}
          loading={loading}
          onEnterPinInstead={() => selectMode("manual")}
        />
      ) : (
        <View style={{ gap: 12 }}>
          <TextField
            label="Gate Pass PIN"
            placeholder="e.g. 483920"
            keyboardType="number-pad"
            value={pin}
            onChangeText={setPin}
          />
          <Button label="Verify" onPress={onSubmitPin} loading={loading} />
        </View>
      )}

      {submitError && !result && (
        <Text style={{ color: colors.danger, fontSize: 13 }}>{submitError}</Text>
      )}
    </ScreenContainer>
  );
}

function ScanPanel({
  permission,
  requestPermission,
  onBarcodeScanned,
  loading,
  onEnterPinInstead,
}: {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: () => Promise<unknown>;
  onBarcodeScanned: (result: { data: string }) => void;
  loading: boolean;
  onEnterPinInstead: () => void;
}) {
  const { colors } = useAppTheme();

  if (!permission) {
    return <Text style={{ color: colors.textSecondary }}>Checking camera permission…</Text>;
  }

  if (!permission.granted) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>Camera Access Needed</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Ultra-Guard needs camera access to scan visitor Gate Pass QR codes. You can also verify a
          pass by typing its PIN instead.
        </Text>
        <Button label="Grant Camera Access" onPress={() => requestPermission()} />
        <Button label="Enter PIN Instead" variant="secondary" onPress={onEnterPinInstead} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={loading ? undefined : onBarcodeScanned}
        />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center" }}>
        {loading ? "Verifying…" : "Point the camera at the visitor's QR code."}
      </Text>
      <Button label="Enter PIN Instead" variant="ghost" onPress={onEnterPinInstead} />
    </View>
  );
}

function ResultCard({ result, onScanNext }: { result: GuardVerifyResult; onScanNext: () => void }) {
  const { colors } = useAppTheme();
  const isSuccess = result.resultCode === "SUCCESS";

  return (
    <View style={{ gap: 16 }}>
      <Card
        style={{
          borderColor: isSuccess ? colors.success : colors.danger,
          alignItems: "center",
          gap: 12,
          paddingVertical: 28,
        }}
      >
        <Text
          style={{
            color: isSuccess ? colors.success : colors.danger,
            fontSize: 28,
            fontWeight: "800",
            letterSpacing: 1,
          }}
        >
          {isSuccess ? "ACCESS GRANTED" : "ACCESS DENIED"}
        </Text>

        {isSuccess && result.visit ? (
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
              {result.visit.visitorName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{result.visit.gate.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{result.visit.property.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
              {result.visit.property.address}
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
            {denialCopy(result)}
          </Text>
        )}
      </Card>

      <Button label="Scan Next" onPress={onScanNext} />
    </View>
  );
}
