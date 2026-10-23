import { describe, expect, it } from "vitest";
import { isPipelineActive } from "@/utils/session-status.utils";

describe("isPipelineActive", () => {
  it("is active for in-flight pipeline statuses", () => {
    expect(isPipelineActive("processing")).toBe(true);
    expect(isPipelineActive("uploading")).toBe(true);
  });

  it("is not active for transcript_ready (avoids endless queue polling)", () => {
    expect(isPipelineActive("transcript_ready")).toBe(false);
  });
});
