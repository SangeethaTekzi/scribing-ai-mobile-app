import { describe, expect, it } from "vitest";
import { shouldShowDoctorQueueLoading } from "@/utils/doctor-queue-loading.utils";

describe("shouldShowDoctorQueueLoading", () => {
  it("shows loading when scope is not ready", () => {
    expect(shouldShowDoctorQueueLoading(false, false, 3)).toBe(true);
  });

  it("hides loading during background refetch when items exist", () => {
    expect(shouldShowDoctorQueueLoading(true, true, 2)).toBe(false);
  });

  it("shows loading for initial fetch with empty queue", () => {
    expect(shouldShowDoctorQueueLoading(true, true, 0)).toBe(true);
  });
});
