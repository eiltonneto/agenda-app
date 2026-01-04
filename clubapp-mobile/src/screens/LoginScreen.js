import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image 
} from "react-native";
import { useAuth } from "../context/AuthContext";

// Importando a imagem diretamente
import logoImg from '../../assets/logo.png'; 

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
      
      {/* Logo sendo exibida aqui */}
      <Image 
        source={logoImg} 
        style={styles.logo} 
      />

      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 20,
    backgroundColor: '#fff', 
  },
  // 👇 A MUDANÇA FOI FEITA AQUI
  logo: {
    width: 200,       // Aumentado para 200
    height: 200,      // Aumentado para 200
    alignSelf: 'center', 
    marginBottom: 10,
    resizeMode: 'contain' 
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#333", 
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F9F9F9",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0A7AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#0A7AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, 
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  }
});