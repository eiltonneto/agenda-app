import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform 
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

export default function EsqueciSenhaScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRecover() {
    if (!email) return Alert.alert("Atenção", "Digite seu e-mail cadastrado.");

    setLoading(true);
    try {
        // AQUI: Futuramente você conectará com sua rota de backend real
        // await api.post('/auth/recuperar-senha', { email });
        
        // Simulação de sucesso para testes visuais
        setTimeout(() => {
            Alert.alert(
                "E-mail Enviado!", 
                "Se este e-mail existir em nossa base, você receberá um link de redefinição.",
                [{ text: "Voltar para Login", onPress: () => navigation.goBack() }]
            );
        }, 1500);

    } catch (error) {
        Alert.alert("Erro", "Falha ao solicitar recuperação.");
    } finally {
        setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={['#000000', '#004d4d']}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>Digite seu e-mail para receber as instruções.</Text>

        <View style={styles.form}>
            <Text style={styles.label}>E-mail cadastrado</Text>
            <TextInput 
                style={styles.input}
                placeholder="exemplo@email.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleRecover} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar Link</Text>}
            </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  logo: { width: 400, height: 150, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#ccc', textAlign: 'center', marginBottom: 40 },
  form: { width: '100%' },
  label: { color: '#fff', marginBottom: 5, marginLeft: 5, fontWeight: 'bold' },
  input: { 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.3)', 
      borderRadius: 10, 
      padding: 15, 
      color: '#fff', 
      marginBottom: 20,
      fontSize: 16 
  },
  button: { 
      backgroundColor: '#008080', 
      padding: 16, 
      borderRadius: 30, 
      alignItems: 'center',
      elevation: 5
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});