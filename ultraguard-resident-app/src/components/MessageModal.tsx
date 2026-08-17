import React, { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { Card } from "./Card";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (message: string) => void;
};

export function MessageModal({
  visible,
  title,
  description,
  placeholder = "Add a message for security (optional)",
  confirmLabel = "Send",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const { colors } = useAppTheme();
  const [message, setMessage] = useState("");

  // Clear the draft whenever the modal closes, whether from Cancel or a successful Send —
  // if Send fails and the modal stays open, the draft is intentionally preserved.
  useEffect(() => {
    if (!visible) setMessage("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Card style={{ gap: 14 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>{title}</Text>
          {description && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{description}</Text>}
          <TextField
            label="Message"
            placeholder={placeholder}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={500}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant={confirmVariant}
                onPress={() => onConfirm(message)}
                loading={loading}
              />
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
