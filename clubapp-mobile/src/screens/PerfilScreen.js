import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  Image, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api, { API_URL } from "../services/api";

export default function PerfilScreen() {
  const { user, logout, updateUser } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);

  // Estado local para a foto (Optimistic UI - muda antes mesmo de salvar no banco)
  const [localAvatar, setLocalAvatar] = useState(user?.foto || null);

  useEffect(() => {
    setLocalAvatar(user?.foto || null);
  }, [user?.foto]);

  const getIniciais = (nome) => {
    if (!nome) return "U";
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  // --- LÓGICA DE FOTO DE PERFIL ---
  async function handlePickImage() {
    setErrorMessage("");
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      setErrorMessage("Precisamos acessar sua galeria para mudar a foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, 
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setLocalAvatar(asset.uri); 
      handleUploadPhoto(asset.uri, asset.mimeType); // 🚀 Correção: Passando o MimeType real
    }
  }

// 🚀 Correção: Recebendo o mimeType
async function handleUploadPhoto(localUri, mimeType) {
    setUploading(true);
    try {
      const formData = new FormData();
      
      // Extrai o nome do arquivo, mas previne falha se o split falhar
      let filename = localUri.split('/').pop();
      if (!filename || !filename.includes('.')) {
        // Se o Android ocultou a extensão, criamos um nome genérico com base no mimeType
        const ext = mimeType ? mimeType.split('/')[1] : 'jpg';
        filename = `avatar_${Date.now()}.${ext}`;
      }
      
      formData.append('foto', {
        uri: localUri, 
        name: filename,
        type: mimeType || 'image/jpeg', // 🚀 Usa o dado do OS, ou falha suavemente para jpeg
      });

      const response = await api.patch("/usuarios/foto", formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        updateUser(response.data);
        Alert.alert("Sucesso", "Foto de perfil atualizada!");
      }

    } catch (error) {
      console.error("Erro no Upload:", error.response?.data || error.message);
      setErrorMessage("Não conseguimos salvar sua foto. Verifique a conexão.");
      setLocalAvatar(user?.foto || null);
    } finally {
      setUploading(false);
    }
  }
  
  // --- LÓGICA DE SENHA ---
  function validarSenha(senha) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return regex.test(senha);
  }

  async function handleChangePassword() {
    setErrorMessage("");

    if (!senhaAtual || !novaSenha) return setErrorMessage("Preencha todos os campos de senha.");
    if (!validarSenha(novaSenha)) return setErrorMessage("A nova senha deve ter letras (maiúsc./minúsc.), números e símbolos.");

    setLoadingSenha(true);
    try {
      await api.patch("/usuarios/senha", { senhaAtual, novaSenha });
      Alert.alert("Sucesso", "Sua senha foi alterada com segurança!");
      setModalVisible(false);
      setSenhaAtual("");
      setNovaSenha("");
    } catch (error) {
      setErrorMessage(error.response?.data?.error || "Senha atual incorreta.");
    } finally {
      setLoadingSenha(false);
    }
  }

  // --- LOGOUT ---
  function handleLogout() {
    if (Platform.OS === 'web') {
       if (window.confirm("Deseja realmente sair?")) logout();
       return;
    }

    Alert.alert("Sair", "Deseja realmente sair do YourFlow?", [
      { text: "Ficar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() }
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* ERRO VISUAL GLOBAL (Fora dos modais) */}
        {errorMessage !== "" && !modalVisible && (
          <View style={[styles.errorContainer, { marginTop: 15 }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.avatarWrapper} activeOpacity={0.7}>
            {uploading ? (
               <View style={[styles.avatarContainer, styles.loadingAvatar]}><ActivityIndicator color="#fff" size="large" /></View>
            ) : localAvatar ? (
               <Image source={{ uri: localAvatar }} style={styles.avatarImage} />
            ) : (
               <View style={styles.avatarContainer}><Text style={styles.avatarText}>{getIniciais(user?.nome)}</Text></View>
            )}
            
            <View style={[styles.editIconBadge, { borderColor: colors.background }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.nome, { color: colors.text }]}>{user?.nome || "Usuário"}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {setErrorMessage(""); setModalVisible(true);}}>
            <View style={styles.iconCircle}><Ionicons name="lock-closed-outline" size={20} color={colors.primary} /></View>
            <Text style={[styles.actionText, { color: colors.text }]}>Alterar Senha</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Configuracoes")}>
            <View style={styles.iconCircle}><Ionicons name="settings-outline" size={20} color={colors.primary} /></View>
            <Text style={[styles.actionText, { color: colors.text }]}>Configurações</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Sair do Aplicativo</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>YourFlow v3.0.1</Text>
      </ScrollView>

      {/* MODAL SENHA */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Segurança</Text>
              
              {/* ERRO VISUAL NO MODAL */}
              {errorMessage !== "" && (
                <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Senha Atual</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
                secureTextEntry 
                value={senhaAtual} 
                onChangeText={setSenhaAtual} 
                placeholder="Sua senha atual"
                placeholderTextColor="#999"
              />

              <Text style={[styles.labelInput, { color: colors.textSecondary, marginTop: 10 }]}>Nova Senha</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
                secureTextEntry 
                value={novaSenha} 
                onChangeText={setNovaSenha} 
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#999"
              />
              <Text style={styles.hint}>* Use letras maiúsculas, minúsculas, números e símbolos (@$!%*?&).</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                  onPress={handleChangePassword} 
                  disabled={loadingSenha}
                >
                  {loadingSenha ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: "center", marginBottom: 30, marginTop: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarContainer: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: "#008080", 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  loadingAvatar: { backgroundColor: '#ccc' },
  avatarText: { fontSize: 40, color: "#fff", fontWeight: "bold" },
  editIconBadge: { 
    position: 'absolute', 
    bottom: 0, 
    right: 5, 
    backgroundColor: '#3b82f6', 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4
  },
  nome: { fontSize: 24, fontWeight: "bold", letterSpacing: -0.5 },
  email: { fontSize: 14, marginTop: 2, opacity: 0.7 },
  section: { borderRadius: 20, padding: 20, marginBottom: 25, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1 },
  actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  actionText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginVertical: 15, opacity: 0.3 },
  logoutButton: { flexDirection: "row", backgroundColor: "#fee2e2", padding: 18, borderRadius: 15, justifyContent: "center", alignItems: "center", gap: 10 },
  logoutText: { color: "#E74C3C", fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", marginTop: 25, fontSize: 12, opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalContent: { borderRadius: 24, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  labelInput: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 5 },
  hint: { fontSize: 11, color: '#999', marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', marginHorizontal: 6 },
  
  // ⚠️ ESTILOS DO ERRO VISUAL
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
});