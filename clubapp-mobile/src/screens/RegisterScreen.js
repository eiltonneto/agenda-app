import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Image, Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function validarSenha(password) {
    // Mínimo 6 caracteres
    if (password.length < 6) {
      Alert.alert("Senha Fraca", "A senha precisa de pelo menos 6 caracteres.");
      return false;
    }
    // Pelo menos um número
    if (!/\d/.test(password)) {
      Alert.alert("Senha Fraca", "A senha precisa de pelo menos um número.");
      return false;
    }
    // Pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
      Alert.alert("Senha Fraca", "A senha precisa de pelo menos uma letra maiúscula.");
      return false;
    }
    // Pelo menos um caractere especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      Alert.alert("Senha Fraca", "A senha precisa de um caractere especial (ex: @, #, !).");
      return false;
    }
    return true;
  }

  async function handleRegister() {
    if (!nome || !email || !senha) return Alert.alert("Erro", "Preencha todos os campos.");
    
    // Valida antes de enviar
    if (!validarSenha(senha)) return;

    // Tenta registrar
    await register(nome, email, senha);
    // Se der erro, o AuthContext geralmente trata ou lança exceção.
    // Se der certo, o redirecionamento é automático.
  }

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1932&auto=format&fit=crop' }} 
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0, 50, 50, 0.95)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{flex: 1}}
        >
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            
            {/* LOGO AREA */}
            <View style={styles.headerContainer}>
                <Image 
                    source={require('../../assets/logo.png')} 
                    style={styles.logo} 
                    resizeMode="contain" 
                />
                <Text style={styles.title}>Crie sua conta</Text>
            </View>

            {/* FORM AREA */}
            <View style={styles.formContainer}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ex: Eilton Neto" 
                    placeholderTextColor="#ccc"
                    value={nome} 
                    onChangeText={setNome} 
                />

                <Text style={styles.label}>E-mail</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ex: seuemail@email.com" 
                    placeholderTextColor="#ccc"
                    value={email} 
                    onChangeText={setEmail} 
                    autoCapitalize="none" 
                    keyboardType="email-address"
                />
                
                <Text style={styles.label}>Senha</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Crie uma senha forte" 
                    placeholderTextColor="#ccc"
                    value={senha} 
                    onChangeText={setSenha} 
                    secureTextEntry 
                />
                <Text style={styles.hint}>
                    Mín. 6 caracteres, 1 número, 1 maiúscula e 1 símbolo (@#!)
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" /> 
                    ) : (
                        <Text style={styles.btnText}>Cadastrar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 30}}>
                <Text style={styles.linkText}>Já tem conta? <Text style={{textDecorationLine: 'underline'}}>Voltar para Login</Text></Text>
            </TouchableOpacity>

          </ScrollView>
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
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    alignItems: 'center',
  },
  
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: { 
    width: 400, 
    height: 150, 
    marginBottom: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#fff",
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 5
  },

  formContainer: {
    width: '100%',
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 5,
    fontSize: 14,
  },
  input: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)', 
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    fontSize: 16,
    marginBottom: 5, // Reduzi para caber o label do próximo
    color: '#fff',
    marginTop: 0
  },
  hint: { 
    fontSize: 12, 
    color: "#ddd", 
    marginBottom: 20, 
    marginTop: 5,
    marginLeft: 5, 
    fontStyle: 'italic' 
  },

  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#008080', // Mantendo o padrão Teal do Login
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  btnText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 18 
  },

  linkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3
  }
});