import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Logo } from "../components/logo";
import AnimatedInput from "../components/AnimatedInput";

// Paleta
const THEME_COLOR = "#0ea5e9";
const THEME_LIGHT = "#e0f2fe";
const TEXT_DARK = "#0f172a";
const TEXT_GRAY = "#64748b";

export default function EsqueciSenhaScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // animação do card
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, []);

  async function handleRecover() {
    if (!email) {
      Alert.alert("Ops", "Informe seu e-mail.");
      return;
    }

    setLoading(true);

    // simulação (backend entra aqui depois)
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "E-mail enviado",
        "Se este e-mail existir, você receberá as instruções.",
        [{ text: "Voltar para login", onPress: () => navigation.goBack() }]
      );
    }, 1200);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.contentWrapper}
      >
        {/* HEADER */}
        <View style={styles.brandHeader}>
          <Logo width={80} height={80} />
          <Text style={styles.appName}>YourFlow</Text>
          <Text style={styles.tagline}>Recuperação de acesso</Text>
        </View>

        {/* CARD */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnim,
              transform: [
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.securityHeader}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="email-lock-outline"
                size={32}
                color={THEME_COLOR}
              />
            </View>

            <Text style={styles.cardTitle}>Recuperar senha</Text>
            <Text style={styles.helperText}>
              Informe o e-mail cadastrado para receber o link.
            </Text>
          </View>

          <View style={styles.formBody}>
            <AnimatedInput
              icon="email-outline"
              placeholder="Seu e-mail"
              value={email}
              onChange={setEmail}
              type="email-address"
              fieldName="recoverEmail"
              focusedField={focusedField}
              setFocusedField={setFocusedField}
            />

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRecover}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  Enviar link de recuperação
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>Voltar para login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_LIGHT
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 24
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 8
  },
  tagline: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginTop: 4
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  securityHeader: {
    alignItems: "center",
    marginBottom: 24
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_DARK
  },
  helperText: {
    fontSize: 14,
    color: TEXT_GRAY,
    textAlign: "center",
    marginTop: 6
  },
  formBody: {
    marginTop: 12
  },
  actionButton: {
    backgroundColor: THEME_COLOR,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  backLink: {
    marginTop: 20,
    alignItems: "center"
  },
  backText: {
    color: THEME_COLOR,
    fontWeight: "600"
  }
});
