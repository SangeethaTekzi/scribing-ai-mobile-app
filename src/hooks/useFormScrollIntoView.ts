import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from "react-native";
import {
  computeKeyboardScrollBottomPadding,
  computeScrollDeltaForField,
  computeVisibleWindowBottomY,
  isAndroidKeyboardResizeActive,
  logFormScrollDiagnostic,
} from "@/utils/formScrollIntoView.utils";

const ANDROID_KEYBOARD_FOOTER_CLEARANCE = 96;

type KeyboardMetrics = {
  height: number;
  screenY: number;
  windowHeight: number;
};

/**
 * Keeps focused fields visible above the keyboard and ensures enough scroll extent on Android.
 */
export function useFormScrollIntoView(
  scrollRef: React.RefObject<ScrollView | null>,
  baseScrollBottomPadding: number,
) {
  const scrollViewportRef = useRef<View>(null);
  const anchors = useRef(new Map<string, View>());
  const scrollYRef = useRef(0);
  const focusedFieldRef = useRef<string | null>(null);
  const alignGenerationRef = useRef(0);
  const baselineWindowHeightRef = useRef(Dimensions.get("window").height);

  const [keyboardMetrics, setKeyboardMetrics] = useState<KeyboardMetrics>({
    height: 0,
    screenY: 0,
    windowHeight: Dimensions.get("window").height,
  });

  const scrollBottomPadding = computeKeyboardScrollBottomPadding(
    baseScrollBottomPadding,
    {
      platform: Platform.OS,
      keyboardHeight: keyboardMetrics.height,
      keyboardScreenY:
        keyboardMetrics.height > 0 ? keyboardMetrics.screenY : null,
      windowHeight: keyboardMetrics.windowHeight,
      baselineWindowHeight: baselineWindowHeightRef.current,
      footerClearance: ANDROID_KEYBOARD_FOOTER_CLEARANCE,
    },
  );

  const setFieldRef = useCallback(
    (key: string) => (node: View | null) => {
      if (node) anchors.current.set(key, node);
      else anchors.current.delete(key);
    },
    [],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const alignFieldToViewport = useCallback(
    (key: string) => {
      const anchor = anchors.current.get(key);
      const scroll = scrollRef.current;
      const viewportNode = scrollViewportRef.current;
      if (!anchor || !scroll || !viewportNode) return;

      const generation = ++alignGenerationRef.current;
      const keyboardHeight = keyboardMetrics.height;
      const keyboardScreenY =
        keyboardHeight > 0 ? keyboardMetrics.screenY : null;
      const windowHeight = Dimensions.get("window").height;
      const baselineWindowHeight = baselineWindowHeightRef.current;

      anchor.measureInWindow((_fx, fieldY, _fw, fieldHeight) => {
        if (generation !== alignGenerationRef.current) return;

        viewportNode.measureInWindow((_sx, viewportY, _sw, viewportHeight) => {
          if (generation !== alignGenerationRef.current) return;

          const viewport = { y: viewportY, height: viewportHeight };
          const field = { y: fieldY, height: fieldHeight };
          const viewportBottom = viewport.y + viewport.height;
          const visibleWindowBottomY = computeVisibleWindowBottomY({
            platform: Platform.OS,
            keyboardHeight,
            keyboardScreenY,
            windowHeight,
            viewportBottom,
            baselineWindowHeight,
          });

          const scrollDelta = computeScrollDeltaForField(
            field,
            viewport,
            visibleWindowBottomY,
          );

          logFormScrollDiagnostic({
            fieldKey: key,
            fieldWindow: field,
            viewport,
            visibleWindowBottomY,
            scrollY: scrollYRef.current,
            scrollDelta,
            keyboardHeight,
            keyboardScreenY,
            platform: Platform.OS,
            windowHeight,
            baselineWindowHeight,
            scrollBottomPadding,
            androidResizeActive: isAndroidKeyboardResizeActive(
              baselineWindowHeight,
              windowHeight,
              keyboardHeight,
            ),
          });

          if (scrollDelta === 0) return;

          scroll.scrollTo({
            y: Math.max(0, scrollYRef.current + scrollDelta),
            animated: true,
          });
        });
      });
    },
    [keyboardMetrics.height, keyboardMetrics.screenY, scrollBottomPadding, scrollRef],
  );

  const scheduleAlign = useCallback(
    (key: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          alignFieldToViewport(key);
        });
      });
    },
    [alignFieldToViewport],
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const windowHeight = Dimensions.get("window").height;
      setKeyboardMetrics({
        height: event.endCoordinates.height,
        screenY: event.endCoordinates.screenY,
        windowHeight,
      });
      const key = focusedFieldRef.current;
      if (key) scheduleAlign(key);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      baselineWindowHeightRef.current = Dimensions.get("window").height;
      setKeyboardMetrics({
        height: 0,
        screenY: 0,
        windowHeight: baselineWindowHeightRef.current,
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scheduleAlign]);

  useEffect(() => {
    const key = focusedFieldRef.current;
    if (!key || keyboardMetrics.height <= 0) return;
    scheduleAlign(key);
  }, [keyboardMetrics.height, keyboardMetrics.screenY, scrollBottomPadding, scheduleAlign]);

  const onFocusField = useCallback(
    (key: string) => () => {
      focusedFieldRef.current = key;
      if (keyboardMetrics.height > 0) {
        scheduleAlign(key);
      }
    },
    [keyboardMetrics.height, scheduleAlign],
  );

  return {
    scrollViewportRef,
    setFieldRef,
    onFocusField,
    onScroll,
    scrollBottomPadding,
  };
}
