import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { TextField } from "@/components/TextField";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { fetchGates } from "@/api/guard";
import { describeError } from "@/api/client";
import type { Gate } from "@/api/types";

const LAST_GATE_KEY = "ultraguard.guard.lastGateId";

type GateGroup = {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  gates: Gate[];
};

function groupByProperty(list: Gate[]): GateGroup[] {
  const map = new Map<string, GateGroup>();
  for (const gate of list) {
    const existing = map.get(gate.propertyId);
    if (existing) {
      existing.gates.push(gate);
    } else {
      map.set(gate.propertyId, {
        propertyId: gate.propertyId,
        propertyName: gate.propertyName,
        propertyAddress: gate.propertyAddress,
        gates: [gate],
      });
    }
  }
  return Array.from(map.values());
}

export default function GuardGateListScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { resident } = useAuth();
  const authed = !!resident;

  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [lastGate, setLastGate] = useState<Gate | null>(null);

  // A signed-in resident's own property/properties, derived from their unit
  // assignments — used to pre-select their gate instead of making them search.
  const myPropertyIds = useMemo(
    () => new Set((resident?.units ?? []).map((ru) => ru.unit.propertyId)),
    [resident],
  );

  const openGate = (gate: Gate, replace: boolean) => {
    AsyncStorage.setItem(LAST_GATE_KEY, gate.id).catch(() => {});
    const nav = replace ? router.replace : router.push;
    nav({
      pathname: "/guard/verify",
      params: { gateId: gate.id, gateName: gate.name, propertyName: gate.propertyName },
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const [gatesRes, lastGateId] = await Promise.all([
          fetchGates(),
          authed ? Promise.resolve(null) : AsyncStorage.getItem(LAST_GATE_KEY),
        ]);

        if (authed) {
          const myGates = gatesRes.gates.filter((g) => myPropertyIds.has(g.propertyId));
          if (myGates.length === 1) {
            // Exactly one gate at their own property — skip the picker entirely.
            setRedirecting(true);
            openGate(myGates[0], true);
            return;
          }
        } else if (lastGateId) {
          setLastGate(gatesRes.gates.find((g) => g.id === lastGateId) ?? null);
        }

        setGates(gatesRes.gates);
      } catch (e) {
        setError(describeError(e, "Couldn't load gates. Check your connection and try again."));
      } finally {
        setLoading(false);
      }
    })();
    // Only ever run once on mount — resident/myPropertyIds don't change mid-screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Residents never search or browse other properties — only their own gate(s), with no
  // way to change to a different property. Unauthenticated guards get the full picker.
  const myGates = useMemo(
    () => (authed ? gates.filter((g) => myPropertyIds.has(g.propertyId)) : []),
    [authed, gates, myPropertyIds],
  );

  const filteredGates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return gates;
    return gates.filter(
      (g) => g.name.toLowerCase().includes(q) || g.propertyName.toLowerCase().includes(q),
    );
  }, [gates, filter]);

  const grouped = useMemo(() => groupByProperty(authed ? myGates : filteredGates), [
    authed,
    myGates,
    filteredGates,
  ]);

  if (loading || redirecting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Authenticated edge cases — no property, or a property with no gates configured yet.
  // Never fall back to the global search list for a signed-in resident.
  if (authed && myPropertyIds.size === 0) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Security Guard Mode</Text>
        <Card>
          <Text style={{ color: colors.textSecondary }}>
            You're not currently linked to a managed property, so there's no gate to verify against.
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (authed && myGates.length === 0) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Security Guard Mode</Text>
        <Card>
          <Text style={{ color: colors.textSecondary }}>
            Your property doesn't have any gates set up yet. Contact your property admin.
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>
          {authed ? "Your Gate" : "Select a Gate"}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          {authed
            ? "Verifying at your own property — pick a gate below if there's more than one."
            : "Choose the gate you're working right now so passes are checked against the right location."}
        </Text>
      </View>

      {!authed && lastGate && (
        <Pressable onPress={() => openGate(lastGate, false)}>
          <Card style={{ borderColor: colors.primary, gap: 4 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Continue where you left off</Text>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
              Continue at {lastGate.name}, {lastGate.propertyName}
            </Text>
          </Card>
        </Pressable>
      )}

      {!authed && (
        <TextField
          label="Filter Gates"
          placeholder="Search by gate or property name"
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
        />
      )}

      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      {!error && grouped.length === 0 && (
        <Card>
          <Text style={{ color: colors.textSecondary }}>No gates match your search.</Text>
        </Card>
      )}

      {grouped.map((group) => (
        <View key={group.propertyId} style={{ gap: 8 }}>
          {!authed && (
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: "700",
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              {group.propertyName}
            </Text>
          )}
          {group.gates.map((gate) => (
            <Pressable key={gate.id} onPress={() => openGate(gate, false)}>
              <Card style={{ marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>{gate.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{group.propertyAddress}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </ScreenContainer>
  );
}
