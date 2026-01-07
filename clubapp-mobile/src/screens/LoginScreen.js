import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ImageBackground, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient'; 
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      await login(email, senha);
    } catch (error) {
      const msg = error.response?.data?.error || "E-mail ou senha incorretos.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground 
      source={require('../../assets/bg-login.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        // Deixei o gradiente um pouco mais escuro embaixo para o texto branco aparecer bem
        colors={['rgba(0,0,0,0.1)', 'rgba(0, 50, 50, 0.9)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.container}
        >
          
          {/* ÁREA DA LOGO (Corrigida: Sem caixa branca) */}
          <View style={styles.logoContainer}>
             <Image 
               source={require('../../assets/logo.png')} 
               style={styles.logo} 
               resizeMode="contain"
             />
            <Text style={styles.appTitle}>Login</Text>
          </View>

          {/* INPUTS */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu e-mail"
              placeholderTextColor="#ccc"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor="#ddd"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />
          </View>

          {/* BOTÃO ENTRAR */}
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* LINKS RODAPÉ (Corrigido: Branco e Clicável) */}
          <View style={styles.footerLinks}>
            <TouchableOpacity 
              onPress={() => navigation.navigate("EsqueciSenha")}
              style={{padding: 10}}
            >
              <Text style={styles.linkText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate("Cadastro")}
              style={{padding: 10}}
            >
              <Text style={[styles.linkText, {fontWeight: 'bold', fontSize: 16}]}>
                Não tem conta? <Text style={{textDecorationLine: 'underline'}}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  
  // LOGO LIMPA (Sem quadrado branco)
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 400, // Aumentei o tamanho
    height: 150,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff', // Título branco
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },

  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#fff', // Label branca
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 5
  },

 input: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)', 
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Mais transparente
    fontSize: 16,
    marginBottom: 15,
    color: '#fff', // TEXTO BRANCO PARA LER NO FUNDO ESCURO
    fontWeight: '500'
  },

  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#008080', // Verde Teal
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  footerLinks: {
    marginTop: 30,
    alignItems: 'center',
    gap: 5
  },
  linkText: {
    color: '#fff', // Texto branco puro
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.8)', // Sombra para garantir leitura
    textShadowRadius: 3
  },
});