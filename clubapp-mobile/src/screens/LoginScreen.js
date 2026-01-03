import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function handleLogin() {
    const ok = await login(email, senha);
    if (!ok) {
      alert("Email ou senha inválidos");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ClubApp - Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <Button
        title={loading ? "Entrando..." : "Entrar"}
        onPress={handleLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
});
