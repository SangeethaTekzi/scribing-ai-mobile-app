import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Waveform } from "@/components/consultation/Waveform";
import { useAudioRecorder } from "@/hooks/recording/useAudioRecorder";
import { useRecordingStore } from "@/store/recording.store";
import { formatDuration } from "@/utils/date.utils";
import { colors, spacing, typography } from "@/theme";

interface ConsultationRecordingControlsProps {
  sessionId: string;
  compact?: boolean;
}

export function ConsultationRecordingControls({
  sessionId,
  compact = false,
}: ConsultationRecordingControlsProps) {
  const [busy, setBusy] = useState(false);
  const {
    state,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
    isRecording,
    isPaused,
  } = useAudioRecorder(sessionId);
  const setUploadProgress = useRecordingStore((s) => s.setUploadProgress);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1.25, { duration: 700 }), -1, true);
    } else {
      pulse.value = withTiming(1);
    }
  }, [isRecording, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const handleStart = async () => {
    try {
      setBusy(true);
      await start();
    } catch (error: unknown) {
      Alert.alert(
        "Cannot start recording",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    try {
      setBusy(true);
      await pause();
    } catch (error: unknown) {
      Alert.alert(
        "Pause failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    try {
      setBusy(true);
      await resume();
    } catch (error: unknown) {
      Alert.alert(
        "Resume failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    try {
      setBusy(true);
      const result = await stop();
      if (!result?.uri) {
        Alert.alert("Recording failed", "No audio file was produced.");
        return;
      }
      setUploadProgress(0);
      router.replace({
        pathname: `/consultation/${sessionId}/uploading`,
        params: {
          uri: result.uri,
          duration: String(result.duration),
        },
      });
    } catch (error: unknown) {
      Alert.alert(
        "Stop failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = isRecording
    ? "Live recording"
    : isPaused
      ? "Paused"
      : state === "stopped"
        ? "Stopped"
        : "Ready to record";

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.indicatorRow}>
        <Animated.View style={[styles.liveDot, isRecording && pulseStyle]} />
        <Text style={styles.liveText}>{statusLabel}</Text>
      </View>

      {!compact ? (
        <>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
          <Waveform active={isRecording} />
        </>
      ) : (
        <Text style={styles.timerCompact}>{formatDuration(elapsedSeconds)}</Text>
      )}

      <View style={[styles.controls, compact && styles.controlsCompact]}>
        {state === "idle" || state === "stopped" ? (
          <ControlButton
            icon="radio-button-on"
            label="Start"
            color={colors.danger}
            onPress={handleStart}
            disabled={busy}
            compact={compact}
          />
        ) : (
          <>
            {isPaused ? (
              <ControlButton
                icon="play"
                label="Resume"
                color={colors.success}
                onPress={handleResume}
                disabled={busy}
                compact={compact}
              />
            ) : (
              <ControlButton
                icon="pause"
                label="Pause"
                color={colors.primary}
                onPress={handlePause}
                disabled={busy}
                compact={compact}
              />
            )}
            <ControlButton
              icon="stop"
              label="Stop"
              color={colors.danger}
              onPress={handleStop}
              disabled={busy}
              compact={compact}
            />
          </>
        )}
      </View>

      {!compact ? (
        <Text style={styles.hint}>
          {state === "idle" || state === "stopped"
            ? "Start when ready. Pause or stop anytime while recording."
            : isPaused
              ? "Recording paused. Resume or stop when ready."
              : "Transcript appears after you stop and upload finishes."}
        </Text>
      ) : null}

      {compact ? (
        <Pressable
          style={styles.fullScreenLink}
          onPress={() =>
            router.push(`/consultation/${sessionId}/recording` as never)
          }
        >
          <Text style={styles.fullScreenLinkText}>Open full recorder</Text>
          <Ionicons name="expand-outline" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ControlButton({
  icon,
  label,
  color,
  onPress,
  disabled,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const size = compact ? 56 : 68;
  const iconSize = compact ? 24 : 28;

  return (
    <Pressable
      style={[styles.control, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.controlBtn,
          { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={colors.white} />
      </View>
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  wrapCompact: {
    gap: spacing.md,
    alignItems: "stretch",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "center",
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  liveText: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timer: {
    fontSize: 52,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1,
  },
  timerCompact: {
    ...typography.heading,
    color: colors.foreground,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    gap: spacing["3xl"],
    marginTop: spacing.sm,
    alignSelf: "center",
  },
  controlsCompact: {
    gap: spacing.xl,
    justifyContent: "center",
  },
  control: { alignItems: "center", gap: spacing.sm },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "600",
  },
  fullScreenLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  fullScreenLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },
});
