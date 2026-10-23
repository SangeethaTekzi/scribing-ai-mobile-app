/** Gap between the focused field and the bottom of the visible scroll viewport. */
export const KEYBOARD_FIELD_GAP = 12;

/** Gap when correcting a field scrolled too far above the viewport. */
export const FOCUS_SCROLL_TOP_GAP = 32;

/** Window height must shrink by at least this fraction of keyboard height to count as adjustResize. */
export const ANDROID_RESIZE_SHRINK_RATIO = 0.2;

export type FieldWindowRect = { y: number; height: number };
export type ScrollViewportRect = { y: number; height: number };

export function isAndroidKeyboardResizeActive(
  baselineWindowHeight: number,
  currentWindowHeight: number,
  keyboardHeight: number,
): boolean {
  if (keyboardHeight <= 0) return false;
  const shrunk = baselineWindowHeight - currentWindowHeight;
  return shrunk >= keyboardHeight * ANDROID_RESIZE_SHRINK_RATIO;
}

/**
 * Bottom Y coordinate (window / screen space) above which content is visible while the keyboard is open.
 */
export function computeVisibleWindowBottomY(options: {
  platform: string;
  keyboardHeight: number;
  keyboardScreenY: number | null;
  windowHeight: number;
  viewportBottom: number;
  baselineWindowHeight: number;
}): number {
  const { keyboardHeight, keyboardScreenY, windowHeight, viewportBottom } =
    options;

  if (keyboardHeight <= 0) {
    return viewportBottom;
  }

  if (keyboardScreenY != null && keyboardScreenY > 0) {
    return Math.min(viewportBottom, keyboardScreenY);
  }

  if (options.platform === "ios") {
    return Math.min(viewportBottom, windowHeight - keyboardHeight);
  }

  const resizeActive = isAndroidKeyboardResizeActive(
    options.baselineWindowHeight,
    windowHeight,
    keyboardHeight,
  );

  if (resizeActive) {
    return Math.min(viewportBottom, windowHeight);
  }

  return Math.min(viewportBottom, windowHeight - keyboardHeight);
}

/**
 * @deprecated Use computeVisibleWindowBottomY — kept for tests migrating to window-bottom API.
 */
export function computeEffectiveViewportBottom(
  viewport: ScrollViewportRect,
  options: {
    platform: string;
    keyboardHeight: number;
    windowHeight: number;
    keyboardScreenY?: number | null;
    baselineWindowHeight?: number;
  },
): number {
  const viewportBottom = viewport.y + viewport.height;
  return computeVisibleWindowBottomY({
    platform: options.platform,
    keyboardHeight: options.keyboardHeight,
    keyboardScreenY: options.keyboardScreenY ?? null,
    windowHeight: options.windowHeight,
    viewportBottom,
    baselineWindowHeight:
      options.baselineWindowHeight ?? options.windowHeight,
  });
}

/**
 * Extra bottom padding so ScrollView content can scroll above a keyboard that overlays (adjustPan).
 * When adjustResize already shrank the window, only a small footer clearance is added.
 */
export function computeKeyboardScrollBottomPadding(
  basePadding: number,
  options: {
    platform: string;
    keyboardHeight: number;
    keyboardScreenY: number | null;
    windowHeight: number;
    baselineWindowHeight: number;
    /** Space to keep the submit button reachable below the last field. */
    footerClearance: number;
  },
): number {
  const { keyboardHeight, platform } = options;
  if (keyboardHeight <= 0) {
    return basePadding;
  }

  if (platform === "ios") {
    return basePadding;
  }

  const resizeActive = isAndroidKeyboardResizeActive(
    options.baselineWindowHeight,
    options.windowHeight,
    keyboardHeight,
  );

  if (resizeActive) {
    return basePadding + options.footerClearance;
  }

  return basePadding + keyboardHeight + options.footerClearance;
}

/**
 * Minimum scroll delta (content coordinates) to keep the field fully visible in the viewport.
 * Positive = scroll down; negative = scroll up (corrects over-scroll).
 */
export function computeScrollDeltaForField(
  field: FieldWindowRect,
  viewport: ScrollViewportRect,
  visibleWindowBottomY: number,
  gap = KEYBOARD_FIELD_GAP,
  topGap = FOCUS_SCROLL_TOP_GAP,
): number {
  const fieldBottom = field.y + field.height;
  const fieldTop = field.y;

  const bottomOverflow = fieldBottom - (visibleWindowBottomY - gap);
  if (bottomOverflow > 0) {
    return bottomOverflow;
  }

  const topOverflow = viewport.y + topGap - fieldTop;
  if (topOverflow > 0) {
    return -topOverflow;
  }

  return 0;
}

export type FormScrollDiagnostic = {
  fieldKey: string;
  fieldWindow: FieldWindowRect;
  viewport: ScrollViewportRect;
  visibleWindowBottomY: number;
  scrollY: number;
  scrollDelta: number;
  keyboardHeight: number;
  keyboardScreenY: number | null;
  platform: string;
  windowHeight: number;
  baselineWindowHeight: number;
  scrollBottomPadding: number;
  androidResizeActive: boolean;
};

export function logFormScrollDiagnostic(diag: FormScrollDiagnostic): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  console.log("[FormScrollIntoView]", diag);
}
