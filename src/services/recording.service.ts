import { Platform } from "react-native";
import { api } from "@/services/api";
import {
  CompleteRecordingData,
  PlaybackUrlResponse,
  RecordingAutosaveData,
  UploadUrlResponse,
} from "@/types/recording.types";
import { Session } from "@/types/session.types";
import { getUploadsBaseUrl } from "@/utils/media.utils";

export { getUploadsBaseUrl };

const extensionForMime = (mime: string) => {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "m4a";
};

async function buildRecordingUploadFormData(
  uri: string,
  duration: number,
  fileName: string,
  mimeType: string,
): Promise<FormData> {
  const formData = new FormData();
  formData.append("duration", String(Math.round(duration)));

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Could not read recording file (${response.status})`);
    }
    const blob = await response.blob();
    const type = blob.type || mimeType || "audio/webm";
    const ext = extensionForMime(type);
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const name = `${baseName}.${ext}`;
    const file =
      typeof File !== "undefined"
        ? new File([blob], name, { type })
        : blob;
    formData.append("audio", file, name);
    return formData;
  }

  formData.append("audio", {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  return formData;
}

export const resolveAudioUrl = (audioUrl: string): string => {
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }

  const base = getUploadsBaseUrl();
  const normalizedPath = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;
  return `${base}${normalizedPath}`;
};

export const recordingService = {
  start: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/start`);
    return response.data.data;
  },

  pause: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/pause`);
    return response.data.data;
  },

  resume: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/resume`);
    return response.data.data;
  },

  autosave: async (
    sessionId: string,
    data: RecordingAutosaveData,
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/autosave`,
      data,
    );
    return response.data.data;
  },

  getUploadUrl: async (
    sessionId: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadUrlResponse> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/upload-url`,
      { fileName, contentType },
    );
    return response.data.data;
  },

  complete: async (
    sessionId: string,
    data: CompleteRecordingData,
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/complete`,
      data,
    );
    return response.data.data;
  },

  uploadFile: async (
    sessionId: string,
    uri: string,
    duration: number,
    fileName = "recording.m4a",
    mimeType = "audio/m4a",
    onProgress?: (progress: number) => void,
  ): Promise<Session> => {
    const formData = await buildRecordingUploadFormData(
      uri,
      duration,
      fileName,
      mimeType,
    );

    const response = await api.post(
      `/sessions/${sessionId}/recording/upload`,
      formData,
      {
        timeout: 10 * 60 * 1000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const ratio = event.loaded / event.total;
          onProgress?.(0.55 + ratio * 0.4);
        },
      },
    );

    return response.data.data;
  },

  getPlaybackUrl: async (sessionId: string): Promise<PlaybackUrlResponse> => {
    const response = await api.get(
      `/sessions/${sessionId}/recording/playback-url`,
    );
    return response.data.data;
  },
};
