import { describe, expect, it } from "vitest";
import {
  isPipelineActive,
  shouldPollSessionDetail,
} from "@/utils/session-status.utils";

describe("isPipelineActive", () => {
  it("is active for in-flight pipeline statuses", () => {
    expect(isPipelineActive("processing")).toBe(true);
    expect(isPipelineActive("uploading")).toBe(true);
  });

  it("is not active for transcript_ready (avoids endless queue polling)", () => {
    expect(isPipelineActive("transcript_ready")).toBe(false);
  });
});

describe("shouldPollSessionDetail", () => {
  it("polls during transcript_ready and AI notes processing", () => {
    expect(shouldPollSessionDetail({ status: "transcript_ready" })).toBe(true);
    expect(
      shouldPollSessionDetail({
        status: "ready_for_review",
        aiNotes: { status: "processing" },
      }),
    ).toBe(true);
  });
});
