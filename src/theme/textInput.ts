import { Platform, type TextStyle } from "react-native";

/** Removes Android/web default focus outline (often yellow/mustard on device themes). */
export const textInputNoFocusRingStyle: TextStyle = Platform.select({
  android: {
    borderWidth: 0,
    backgroundColor: "transparent",
    outlineWidth: 0,
  },
  ios: {},
  default: {
    outlineStyle: "none",
  } as unknown as TextStyle,
}) ?? {};

export const textInputNoFocusRingProps = Platform.select({
  android: { underlineColorAndroid: "transparent" as const },
  default: {},
}) ?? {};
