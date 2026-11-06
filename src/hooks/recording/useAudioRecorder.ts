import { useCallback, useEffect, useRef } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
} from "expo-audio";
import type { AudioRecorder } from "expo-audio";
import { useRecordingStore } from "@/store/recording.store";
import { recordingService } from "@/services/recording.service";

const safeStopRecorder = async (recorder: AudioRecorder) => {
  try {
    await recorder.stop();
    return recorder.uri;
  } catch {
    return null;
  }
};

export const useAudioRecorder = (sessionId: string) => {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    state,
    elapsedSeconds,
    uri,
    setSessionId,
    setState,
    setElapsedSeconds,
    setUri,
    reset,
  } = useRecordingStore();

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setInterval(() => {
      useRecordingStore.setState((prev) => ({
        elapsedSeconds: prev.elapsedSeconds + 1,
      }));
    }, 1000);
  };

  useEffect(() => {
    setSessionId(sessionId);
    return () => {
      clearTimer();
    };
  }, [sessionId, setSessionId]);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required to record.");
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    });

    await recordingService.start(sessionId);

    await recorder.prepareToRecordAsync();
    recorder.record();
    setUri(null);
    setElapsedSeconds(0);
    setState("recording");
    startTimer();
  }, [recorder, sessionId, setElapsedSeconds, setState, setUri]);

  const pause = useCallback(async () => {
    if (useRecordingStore.getState().state !== "recording") return;
    try {
      recorder.pause();
    } catch {
      throw new Error("Could not pause recording on this device.");
    }
    clearTimer();
    setState("paused");
    try {
      await recordingService.pause(sessionId);
    } catch {
      // local pause still applies
    }
  }, [recorder, sessionId, setState]);

  const resume = useCallback(async () => {
    if (useRecordingStore.getState().state !== "paused") return;
    try {
      recorder.record();
    } catch {
      throw new Error("Could not resume recording.");
    }
    setState("recording");
    startTimer();
    const elapsedSeconds = useRecordingStore.getState().elapsedSeconds;
    try {
      await recordingService.resume(sessionId);
      await recordingService.autosave(sessionId, {
        recordingStatus: "recording",
        elapsedSeconds,
      });
    } catch {
      // local resume still applies
    }
  }, [recorder, sessionId, setState]);

  const stop = useCallback(async () => {
    const snap = useRecordingStore.getState();
    if (snap.state !== "recording" && snap.state !== "paused") {
      return snap.uri ? { uri: snap.uri, duration: snap.elapsedSeconds } : null;
    }

    clearTimer();
    const recordingUri = (await safeStopRecorder(recorder)) ?? snap.uri;

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    });

    setUri(recordingUri);
    setState("stopped");
    return {
      uri: recordingUri,
      duration: snap.elapsedSeconds,
    };
  }, [recorder, setState, setUri]);

  return {
    state,
    elapsedSeconds,
    uri,
    start,
    pause,
    resume,
    stop,
    reset,
    isRecording: state === "recording",
    isPaused: state === "paused",
  };
};
