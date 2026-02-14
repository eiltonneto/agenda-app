import React, { useState, useRef, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, Animated, 
  ScrollView, Easing
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient'; 
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Polygon } from 'react-native-svg';

import { useTheme } from "../context/ThemeContext";

// --- COMPONENTE LOGO (MANTIDO INTACTO) ---
const Logo = ({ width = 120, height = 120 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 32 32" fill="none">
      <Defs>
        <SvgGradient id="a" x1="-67.907" y1="-308.551" x2="-67.857" y2="-308.564" gradientTransform="matrix(87.822 0 0 -88.533 5984.532 -27290.617)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffb047" />
        </SvgGradient>
        <SvgGradient id="b" x1="-67.674" y1="-310.121" x2="-67.647" y2="-310.063" gradientTransform="matrix(87.822 0 0 -88.533 5964.667 -27443)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd754" />
          <Stop offset="1" stopColor="#ffb532" />
        </SvgGradient>
        <SvgGradient id="c" x1="-67.029" y1="-310.91" x2="-67.029" y2="-310.86" gradientTransform="matrix(87.822 0 0 -88.533 5902.8 -27518.733)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd642" />
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffb532" />
        </SvgGradient>
        <SvgGradient id="d" x1="-66.252" y1="-310.377" x2="-66.32" y2="-310.362" gradientTransform="matrix(106.198 0 0 -88.551 7048.428 -27474.167)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffa829" />
        </SvgGradient>
      </Defs>
      
      <Path d="M23.426 29.41V22.172h-7.18l7.18 7.238" fill="#ffdf51" fillOpacity="0.7" />
      <Path d="M24.231 25.306V17.477H16.466l7.766 7.829" fill="#ff8900" fillOpacity="0.7" />
      <Path d="M19.515 22.171V30h7.766l-7.766-7.829" fill="url(#a)" fillOpacity="0.7" />
      <Path d="M22.608 18V11.809H16.466L22.608 18" fill="#ffdf4f" fillOpacity="0.7" />
      <Path d="M25.524 16.525V8.7H17.759l7.766 7.829" fill="url(#b)" fillOpacity="0.8" />
      <Path d="M12.288 2V9.829h7.766L12.288 2" fill="url(#c)" fillOpacity="0.8" />
      <Path d="M14.11 14.262V6.433H4.719l7.732 7.83 1.659 0" fill="url(#d)" fillOpacity="0.88" />
      <Path d="M14.11 29.958V20.487H4.719l9.391 9.471" fill="#ffb700" fillOpacity="0.7" />
      <Path d="M14.112 22.114V14.285H6.346l7.766 7.829" fill="#ffb700" fillOpacity="0.5" />
      <Path d="M16.465 11.809v7.829h7.766l-7.766-7.829" fill="#ffcd25" fillOpacity="0.7" />
      <Path d="M14.092 12.691V4.862H6.326l7.766 7.829" fill="#ff8900" fillOpacity="0.7" />
      <Path d="M16.246 22.171V30h7.766l-7.766-7.829" fill="#ff8900" fillOpacity="0.7" />
      <Polygon points="21.122 22.172 18.609 19.638 16.465 19.638 16.466 11.809 20.847 11.809 18.882 9.829 14.092 9.829 14.11 14.262 14.11 20.487 14.11 30 16.246 30 16.246 22.172 21.122 22.172" fill="#fff" />
    </Svg>
  );
};

// --- COMPONENTE INPUT ANIMADO (MANTIDO INTACTO) ---
const AnimatedInput = ({ icon, placeholder, value, onChangeText, type, secure, onToggleSecure, fieldName, setFocusedField, focusedField, themeColor }) => {
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focusedField === fieldName ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
  }, [focusedField]);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['#e2e8f0', themeColor] });
  const backgroundColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['#f8fafc', '#f0f9ff'] });
  const scale = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const elevation = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  return (
    <Animated.View style={[
      styles.inputContainer, 
      { borderColor, backgroundColor, transform: [{ scale }], elevation }
    ]}>
      <MaterialCommunityIcons 
        name={icon} size={22} 
        color={focusedField === fieldName ? themeColor : "#94a3b8"} 
        style={styles.inputIcon} 
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText} 
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        secureTextEntry={secure}
        keyboardType={type}
        autoCapitalize="none"
        cursorColor={themeColor}
      />
      {onToggleSecure && (
        <TouchableOpacity onPress={onToggleSecure} style={styles.eyeIcon}>
          <MaterialIcons name={secure ? "visibility" : "visibility-off"} size={22} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default function AuthScreen() {
  const { login, register } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = theme.colors;

  const THEME_COLOR = colors.primary; 
  const TEXT_DARK = colors.text;   
  const TEXT_GRAY = colors.textSecondary; 

  const [isLogin, setIsLogin] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [lembrar, setLembrar] = useState(false);
  
  // ⚠️ NOVO ESTADO: Mensagem de erro visual ⚠️
  const [errorMessage, setErrorMessage] = useState("");

  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 10 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 60 }).start();
  };

  const flipAnim = useRef(new Animated.Value(0)).current; 
  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  const flipCard = () => {
    setErrorMessage(""); // Limpa o erro ao virar o card
    if (isLogin) {
      Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
      setIsLogin(false);
    } else {
      Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
      setIsLogin(true);
    }
  };

  const tratarErro = (error) => {
    let mensagem = error.response?.data?.error || error.response?.data?.message;

    if (!mensagem) {
        if (error.message && error.message.includes("Network Error")) {
            mensagem = "Sem conexão. Verifique se o servidor está online.";
        } else if (error.code === "ECONNABORTED") {
            mensagem = "O servidor demorou muito para responder.";
        } else {
            mensagem = "Ocorreu um erro inesperado.";
        }
    }
    // Em vez de Alert, usamos o estado visual para garantir que funcione na Vercel
    setErrorMessage(mensagem);
  };

  async function handleSubmit() {
    handlePressOut();
    setErrorMessage(""); // Limpa erros antigos
    
    if (isLogin) {
      if (!email.trim() || !senha.trim()) {
        return setErrorMessage("Preencha e-mail e senha.");
      }
      setLoading(true);
      try { 
        await login(email, senha); 
      } catch (e) { 
        tratarErro(e);
      } finally { 
        setLoading(false); 
      }
    } else {
      if (!nome.trim()) return setErrorMessage("Digite seu nome.");
      if (!email.trim()) return setErrorMessage("Digite seu e-mail.");
      if (!senha.trim()) return setErrorMessage("Crie uma senha.");
      if (senha !== confirmaSenha) return setErrorMessage("As senhas não conferem.");
      if (senha.length < 6) return setErrorMessage("Sua senha deve ter no mínimo 6 caracteres.");

      setLoading(true);
      try {
        await register(nome, email, senha);
        // Sucesso no cadastro
        setIsLogin(true); // Força voltar pro login
        flipCard();
        setErrorMessage("Conta criada com sucesso! Faça login.");
      } catch (e) { 
        tratarErro(e);
      } finally { 
        setLoading(false); 
      }
    }
  }

  return (
    <LinearGradient 
      colors={[colors.background, '#f0f9ff', '#ffffff']} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={[styles.contentWrapper, { maxWidth: 480, width: '100%', alignSelf: 'center' }]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          
          <View style={styles.brandHeader}>
             <Logo width={80} height={80} /> 
             <Text style={[styles.appName, {color: TEXT_DARK}]}>YourFlow</Text>
             <Text style={[styles.tagline, {color: TEXT_GRAY}]}>Organize sua vida. Domine seu tempo.</Text>
          </View>

          <View style={{ minHeight: 620 }}> 
            
            {/* --- LOGIN --- */}
            <Animated.View 
              style={[
                styles.cardFace, 
                { opacity: frontOpacity, transform: [{ rotateY: frontInterpolate }], shadowColor: THEME_COLOR }
              ]}
              pointerEvents={isLogin ? 'auto' : 'none'} 
            >
              <View style={styles.tabHeader}>
                <View style={[styles.tabItem, styles.tabActive]}><Text style={[styles.tabTextActive, {color: THEME_COLOR}]}>Acessar</Text></View>
                <TouchableOpacity style={styles.tabItem} onPress={flipCard}><Text style={styles.tabTextInactive}>Criar Conta</Text></TouchableOpacity>
              </View>

              <View style={styles.securityHeader}>
                <View style={[styles.identityShieldContainer, {backgroundColor: '#e0f2fe', borderColor: '#fff', shadowColor: THEME_COLOR}]}>
                  <MaterialCommunityIcons name="shield-check" size={32} color={THEME_COLOR} />
                </View>
                <Text style={[styles.cardTitle, {color: TEXT_DARK}]}>Acesse sua conta</Text>
                <Text style={[styles.helperText, {color: TEXT_GRAY}]}>Informe seus dados para entrar.</Text>
              </View>

              <View style={[styles.formBody, { justifyContent: 'center', flex: 1 }]}>
                
                {/* EXIBIÇÃO DE ERRO VISUAL */}
                {errorMessage !== "" && isLogin && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <AnimatedInput 
                    icon="email-outline" placeholder="Seu e-mail" value={email} onChangeText={setEmail} type="email-address" fieldName="emailLogin" 
                    focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR}
                />
                <AnimatedInput 
                    icon="lock-outline" placeholder="Sua senha" value={senha} onChangeText={setSenha} secure={!showPassword} onToggleSecure={() => setShowPassword(!showPassword)} fieldName="senhaLogin" 
                    focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR}
                />
                
                <View style={styles.optionsRow}>
                  <TouchableOpacity style={styles.checkboxContainer} onPress={() => setLembrar(!lembrar)} activeOpacity={0.6}>
                    <MaterialCommunityIcons name={lembrar ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color={lembrar ? THEME_COLOR : "#cbd5e1"} />
                    <Text style={[styles.checkboxText, {color: TEXT_GRAY}, lembrar && { color: TEXT_DARK, fontWeight: '600' }]}>Lembrar-me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate("EsqueciSenha")}>
                    <Text style={[styles.forgotText, {color: THEME_COLOR}]}>Esqueci a senha</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={[styles.loginButton, {backgroundColor: THEME_COLOR, shadowColor: THEME_COLOR}]} 
                    onPress={handleSubmit} 
                    onPressIn={handlePressIn} 
                    onPressOut={handlePressOut} 
                    disabled={loading}
                    activeOpacity={1} 
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.loginButtonText}>Entrar na conta</Text>
                        <MaterialCommunityIcons name="login-variant" size={24} color="#fff" style={{ marginLeft: 10 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            {/* --- CADASTRO --- */}
            <Animated.View 
              style={[
                styles.cardFace, styles.cardBack, 
                { opacity: backOpacity, transform: [{ rotateY: backInterpolate }], shadowColor: THEME_COLOR }
              ]}
              pointerEvents={!isLogin ? 'auto' : 'none'}
            >
              <View style={styles.tabHeader}>
                <TouchableOpacity style={styles.tabItem} onPress={flipCard}><Text style={styles.tabTextInactive}>Acessar</Text></TouchableOpacity>
                <View style={[styles.tabItem, styles.tabActive]}><Text style={[styles.tabTextActive, {color: THEME_COLOR}]}>Criar Conta</Text></View>
              </View>

              <View style={styles.securityHeader}>
                <View style={[styles.identityShieldContainer, {backgroundColor: '#e0f2fe', borderColor: '#fff', shadowColor: THEME_COLOR}]}>
                  <MaterialCommunityIcons name="account-plus" size={32} color={THEME_COLOR} />
                </View>
                <Text style={[styles.cardTitle, {color: TEXT_DARK}]}>Comece Gratuitamente</Text>
                <Text style={[styles.helperText, {color: TEXT_GRAY}]}>Crie sua identidade agora.</Text>
              </View>

              <View style={styles.formBody}>
                
                {/* EXIBIÇÃO DE ERRO VISUAL */}
                {errorMessage !== "" && !isLogin && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <AnimatedInput icon="account-outline" placeholder="Seu nome completo" value={nome} onChangeText={setNome} fieldName="nome" focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR} />
                <AnimatedInput icon="email-outline" placeholder="Seu melhor e-mail" value={email} onChangeText={setEmail} type="email-address" fieldName="emailCad" focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR} />
                <AnimatedInput icon="lock-outline" placeholder="Crie uma senha" value={senha} onChangeText={setSenha} secure={!showPassword} onToggleSecure={() => setShowPassword(!showPassword)} fieldName="senhaCad" focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR} />
                <AnimatedInput icon="lock-check-outline" placeholder="Confirme a senha" value={confirmaSenha} onChangeText={setConfirmaSenha} secure={!showPassword} fieldName="confirma" focusedField={focusedField} setFocusedField={setFocusedField} themeColor={THEME_COLOR} />

                <View style={{ height: 20 }} />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={[styles.loginButton, {backgroundColor: THEME_COLOR, shadowColor: THEME_COLOR}]} 
                    onPress={handleSubmit}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={loading}
                    activeOpacity={1} 
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.loginButtonText}>Criar minha conta</Text>
                        <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" style={{ marginLeft: 10 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

          </View>
          <View style={{ height: 50 }} /> 
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1, paddingHorizontal: 20 },
  brandHeader: { alignItems: 'center', marginBottom: 20, marginTop: 40 },
  appName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 5 },
  tagline: { fontSize: 14, fontWeight: '500', marginTop: 4, letterSpacing: 0.5 },

  cardFace: {
    backgroundColor: '#fff', 
    borderRadius: 24, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 15, 
    elevation: 8, 
    overflow: 'hidden',
    width: '100%',
    height: '100%', 
    position: 'absolute', 
    backfaceVisibility: 'hidden', 
  },
  cardBack: { },

  tabHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, margin: 12, marginBottom: 0, borderRadius: 16 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabTextActive: { fontWeight: 'bold', fontSize: 15 },
  tabTextInactive: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },

  securityHeader: { alignItems: 'center', marginTop: 20, paddingHorizontal: 25 },
  identityShieldContainer: { marginBottom: 15, padding: 16, borderRadius: 22, borderWidth: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  helperText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 10 },

  formBody: { padding: 24, paddingTop: 5 },
  
  // ⚠️ ESTILO DO ERRO VISUAL ⚠️
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    height: 56, 
    paddingHorizontal: 16, 
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', color: '#0f172a', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  eyeIcon: { padding: 8 },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 5 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkboxText: { fontSize: 14, marginLeft: 8 },
  forgotText: { fontWeight: '600', fontSize: 14 },

  loginButton: { width: '100%', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});