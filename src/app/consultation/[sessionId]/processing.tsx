import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { Card } from "@/components/ui/Card";
import { Timeline, TimelineStep } from "@/components/ui/Timeline";
import { IndeterminateProgress } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, ErrorState } from "@/components/ui/EmptyState";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { PROCESSING_STEPS } from "@/constants/status";
import {
  getTranscriptPipelineError,
  isReviewReady,
  isTranscriptAiUnavailable,
  isTranscriptAvailable,
} from "@/utils/session-status.utils";
import { bootstrapManualConsultationDraft } from "@/utils/consultation-workflow.utils";
import { sessionKeys, aiNotesKeys } from "@/services/query-keys";
import { getApiErrorMessage } from "@/utils/prescriptionMedication.utils";
import { colors, spacing, typography } from "@/theme";

export default function ProcessingScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: session, isLoading, isError, refetch } = useSession(sessionId);
  const { transcript } = useTranscript(sessionId);
  const { generate } = useTranscriptMutations(sessionId);
  const { aiNotes, isGenerating } = useAiNotes(sessionId);
  const pipelineKickoffRef = useRef(false);
  const [continuingManual, setContinuingManual] = useState(false);

  useEffect(() => {
    if (!sessionId || !session || pipelineKickoffRef.current) return;
    if (session.status !== "processing" && session.status !== "uploading") return;

    const meta = transcript?.metadata?.status;
    const needsKick =
      session.status === "processing" &&
      (!meta || meta === "processing" || meta === "pending");
    if (!needsKick) return;

    const timer = setTimeout(() => {
      pipelineKickoffRef.current = true;
      generate.mutate();
    }, 4000);

    return () => clearTimeout(timer);
  }, [sessionId, session?.status, transcript?.metadata?.status, generate]);

  useEffect(() => {
    if (!session) return;

    if (isReviewReady(session.status)) {
      router.replace(`/consultation/${sessionId}/notes`);
      return;
    }

    if (
      isTranscriptAvailable(session.status) &&
      session.status === "transcript_ready" &&
      !isGenerating &&
      aiNotes &&
      (aiNotes.subjective || aiNotes.assessment)
    ) {
      router.replace(`/consultation/${sessionId}/transcript`);
    }
  }, [session, sessionId, aiNotes, isGenerating]);

  const handleContinueWithoutAi = async () => {
    if (!sessionId) return;
    try {
      setContinuingManual(true);
      await bootstrapManualConsultationDraft(sessionId);
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
      await queryClient.invalidateQueries({
        queryKey: aiNotesKeys.detail(sessionId),
      });
      router.replace(`/consultation/${sessionId}/notes`);
    } catch (error) {
      Alert.alert(
        "Could not continue",
        getApiErrorMessage(error, "Unable to start manual notes."),
      );
    } finally {
      setContinuingManual(false);
    }
  };

  const aiUnavailable =
    isTranscriptAiUnavailable(session) ||
    transcript?.metadata?.status === "ai_unavailable";

  const steps: TimelineStep[] = useMemo(() => {
    const status = session?.status;
    const notesStatus = aiNotes?.status;
    const transcriptDone = isTranscriptAvailable(status);
    const notesDone = isReviewReady(status);
    const failed =
      status === "failed" ||
      notesStatus === "failed" ||
      (transcript?.metadata?.status === "failed" && !aiUnavailable);

    const currentIndex = (() => {
      if (failed) return 2;
      if (notesDone) return 5;
      if (notesStatus === "processing" || isGenerating) {
        return aiNotes?.medications?.length ? 4 : 3;
      }
      if (transcriptDone) return 3;
      if (status === "processing") return 2;
      if (status === "uploading") return 1;
      return 0;
    })();

    return PROCESSING_STEPS.map((step, index) => {
      let stepStatus: TimelineStep["status"] = "pending";
      if (failed && index === currentIndex) stepStatus = "failed";
      else if (index < currentIndex) stepStatus = "completed";
      else if (index === currentIndex) stepStatus = "current";
      return { key: step.key, label: step.label, status: stepStatus };
    });
  }, [session?.status, aiNotes, isGenerating, transcript?.metadata?.status, aiUnavailable]);

  if (isLoading) return <LoadingScreen message="Preparing consultation…" />;
  if (isError || !session) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <View style={styles.screen}>
      <GlassHeader
        title="Processing"
        subtitle={
          aiUnavailable
            ? "AI transcription unavailable"
            : "Generating transcript & notes"
        }
        showBack={session.status === "failed" || aiUnavailable}
      />
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + spacing["2xl"] },
        ]}
      >
        <Card style={styles.card}>
          <Text style={styles.title}>
            {aiUnavailable ? "Continue manually" : "AI is working"}
          </Text>
          <Text style={styles.subtitle}>
            {aiUnavailable
              ? "You can still complete notes and prescription without AI."
              : "We're converting speech to text and preparing clinical notes when AI is configured."}
          </Text>
          {!aiUnavailable ? <IndeterminateProgress /> : null}
          <View style={styles.timeline}>
            <Timeline steps={steps} />
          </View>
          {aiUnavailable ? (
            <Text style={styles.errorHint}>
              {transcript?.metadata?.error ||
                getTranscriptPipelineError(session) ||
                "AI transcription is unavailable on the server."}
            </Text>
          ) : null}
          {aiUnavailable ? (
            <Button
              title="Continue without AI (manual notes)"
              loading={continuingManual}
              onPress={() => void handleContinueWithoutAi()}
            />
          ) : null}
          {transcript?.metadata?.status === "failed" ||
          session.status === "failed" ? (
            <Button
              title="Retry transcript"
              variant="outline"
              onPress={() => {
                pipelineKickoffRef.current = false;
                generate.mutate();
              }}
            />
          ) : null}
          {aiUnavailable ? (
            <Button
              title="Retry transcript"
              variant="outline"
              onPress={() => {
                pipelineKickoffRef.current = false;
                generate.mutate();
              }}
            />
          ) : null}
          {isTranscriptAvailable(session.status) && !aiUnavailable ? (
            <Button
              title="View Transcript"
              onPress={() =>
                router.replace(`/consultation/${sessionId}/transcript`)
              }
            />
          ) : null}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  card: { gap: spacing.lg },
  title: { ...typography.heading, color: colors.foreground },
  subtitle: { ...typography.body, color: colors.muted },
  errorHint: { ...typography.caption, color: colors.danger },
  timeline: { marginTop: spacing.sm },
});
