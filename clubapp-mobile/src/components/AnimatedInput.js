import React, { useRef, useEffect } from "react";
import { Animated, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Easing } from "react-native";

// PALETA (IGUAL AO AUTH)
const THEME_COLOR = "#0ea5e9";
const TEXT_DARK = "#0f172a";

export default function AnimatedInput({
  icon,
  placeholder,
  value,
  onChange,
  type,
  secure,
  onToggleSecure,
  fieldName,
  setFocusedField,
  focusedField
}) {
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focusedField === fieldName ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
  }, [focusedField]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e2e8f0", THEME_COLOR]
  });

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#f8fafc", "#f0f9ff"]
  });

  const scale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });

  return (
    <Animated.View
      style={[
        styles.inputContainer,
        {
          borderColor,
          backgroundColor,
          transform: [{ scale }]
        }
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={focusedField === fieldName ? THEME_COLOR : "#94a3b8"}
        style={styles.inputIcon}
      />

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        secureTextEntry={secure}
        keyboardType={type}
        autoCapitalize="none"
        cursorColor={THEME_COLOR}
      />

      {onToggleSecure && (
        <TouchableOpacity onPress={onToggleSecure} style={styles.eyeIcon}>
          <MaterialIcons
            name={secure ? "visibility" : "visibility-off"}
            size={22}
            color="#94a3b8"
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    height: "100%",
    color: TEXT_DARK,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {})
  },
  eyeIcon: { padding: 8 }
});
