import { describe, expect, it } from "vitest";
import {
  computeEffectiveViewportBottom,
  computeKeyboardScrollBottomPadding,
  computeScrollDeltaForField,
  computeVisibleWindowBottomY,
  isAndroidKeyboardResizeActive,
} from "@/utils/formScrollIntoView.utils";

describe("isAndroidKeyboardResizeActive", () => {
  it("is true when the window shrinks with the keyboard", () => {
    expect(isAndroidKeyboardResizeActive(900, 520, 360)).toBe(true);
  });

  it("is false when the keyboard overlays without resizing the window", () => {
    expect(isAndroidKeyboardResizeActive(900, 895, 360)).toBe(false);
  });
});

describe("computeVisibleWindowBottomY", () => {
  it("uses keyboard screenY when provided (pan / overlay)", () => {
    const bottom = computeVisibleWindowBottomY({
      platform: "android",
      keyboardHeight: 320,
      keyboardScreenY: 540,
      windowHeight: 900,
      viewportBottom: 900,
      baselineWindowHeight: 900,
    });
    expect(bottom).toBe(540);
  });

  it("uses shrunk window height on Android resize when screenY is missing", () => {
    const bottom = computeVisibleWindowBottomY({
      platform: "android",
      keyboardHeight: 320,
      keyboardScreenY: null,
      windowHeight: 580,
      viewportBottom: 900,
      baselineWindowHeight: 900,
    });
    expect(bottom).toBe(580);
  });

  it("clamps to keyboard top on iOS", () => {
    const bottom = computeVisibleWindowBottomY({
      platform: "ios",
      keyboardHeight: 336,
      keyboardScreenY: null,
      windowHeight: 844,
      viewportBottom: 820,
      baselineWindowHeight: 844,
    });
    expect(bottom).toBe(508);
  });
});

describe("computeEffectiveViewportBottom", () => {
  it("delegates to keyboard screenY on Android overlay", () => {
    const bottom = computeEffectiveViewportBottom(
      { y: 100, height: 800 },
      {
        platform: "android",
        keyboardHeight: 300,
        windowHeight: 900,
        keyboardScreenY: 600,
        baselineWindowHeight: 900,
      },
    );
    expect(bottom).toBe(600);
  });
});

describe("computeKeyboardScrollBottomPadding", () => {
  const base = 48;

  it("adds keyboard height on Android when the window does not resize", () => {
    const pad = computeKeyboardScrollBottomPadding(base, {
      platform: "android",
      keyboardHeight: 300,
      keyboardScreenY: 600,
      windowHeight: 900,
      baselineWindowHeight: 900,
      footerClearance: 96,
    });
    expect(pad).toBe(base + 300 + 96);
  });

  it("adds only footer clearance on Android resize", () => {
    const pad = computeKeyboardScrollBottomPadding(base, {
      platform: "android",
      keyboardHeight: 300,
      keyboardScreenY: 600,
      windowHeight: 580,
      baselineWindowHeight: 900,
      footerClearance: 96,
    });
    expect(pad).toBe(base + 96);
  });

  it("does not add keyboard padding on iOS", () => {
    const pad = computeKeyboardScrollBottomPadding(base, {
      platform: "ios",
      keyboardHeight: 336,
      keyboardScreenY: 508,
      windowHeight: 844,
      baselineWindowHeight: 844,
      footerClearance: 96,
    });
    expect(pad).toBe(base);
  });
});

describe("computeScrollDeltaForField", () => {
  const viewport = { y: 120, height: 400 };

  it("returns positive delta when field extends below visible window bottom", () => {
    const field = { y: 500, height: 52 };
    expect(
      computeScrollDeltaForField(field, viewport, 520),
    ).toBeGreaterThan(0);
  });

  it("returns zero when field is fully visible", () => {
    const field = { y: 200, height: 52 };
    expect(computeScrollDeltaForField(field, viewport, 520)).toBe(0);
  });

  it("returns negative delta when field was over-scrolled above viewport", () => {
    const field = { y: 100, height: 52 };
    expect(computeScrollDeltaForField(field, viewport, 520)).toBeLessThan(0);
  });

  it("scrolls when allergies sit behind keyboard (overlay scenario)", () => {
    const field = { y: 620, height: 72 };
    const visibleBottom = 540;
    expect(
      computeScrollDeltaForField(field, { y: 0, height: 800 }, visibleBottom),
    ).toBe(620 + 72 - (540 - 12));
  });
});
