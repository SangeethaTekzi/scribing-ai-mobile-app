import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { medicineService } from "@/services/medicine.service";
import { useTenantScope } from "@/hooks/useTenantScope";
import type { MedicineSearchResult } from "@/types/medicine.types";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import { createEmptyMedication } from "@/utils/prescriptionMedication.utils";
import { colors, spacing, typography } from "@/theme";

interface MedicineSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (medication: AiNotesMedication) => void;
}

export function MedicineSearchSheet({
  visible,
  onClose,
  onSelect,
}: MedicineSearchSheetProps) {
  const insets = useSafeAreaInsets();
  const { organizationId } = useTenantScope();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicineSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await medicineService.search(trimmed, organizationId);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visible, organizationId]);

  const emptyHint = useMemo(() => {
    if (!query.trim()) {
      return "Search by medicine name or symptom (e.g. fever, headache)";
    }
    if (loading) return "Searching…";
    return `No medicines found for "${query.trim()}"`;
  }, [query, loading]);

  const pickMedicine = (medicine: MedicineSearchResult) => {
    const displayName = medicine.strength
      ? `${medicine.name} ${medicine.strength}`.trim()
      : medicine.name;
    onSelect({
      ...createEmptyMedication(),
      medicine: displayName,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Add medicine</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Medicine, condition, or symptom…"
            autoFocus
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id || item._id || item.name)}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{emptyHint}</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => pickMedicine(item)}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {[item.strength, item.form, item.genericName]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {item.matchedConditions?.length ? (
                <Text style={styles.matchLine} numberOfLines={2}>
                  Matched: {item.matchedConditions.join(", ")}
                </Text>
              ) : item.indications?.length ? (
                <Text style={styles.indicationLine} numberOfLines={2}>
                  {item.indications
                    .slice(0, 2)
                    .map((ind) => ind.name)
                    .join(" · ")}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title="Add blank row"
            variant="outline"
            onPress={() => {
              onSelect(createEmptyMedication());
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, color: colors.foreground },
  searchWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing["2xl"],
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowName: { ...typography.bodyMedium, color: colors.foreground },
  rowMeta: { ...typography.caption, color: colors.muted, marginTop: 2 },
  matchLine: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 4,
  },
  indicationLine: {
    ...typography.caption,
    color: colors.mutedLight,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
});
