import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  Image, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform 
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
  
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);

  const getIniciais = (nome) => {
    if (!nome) return "U";
    const partes = nome.trim().split(" ");
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  async function handlePickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Precisamos acessar sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) handleUploadPhoto(result.assets[0].uri);
  }

  async function handleUploadPhoto(localUri) {
    setUploading(true);
    try {
      // --- CORREÇÃO DO UPLOAD ---
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // Ajuste de URI para Android/iOS
      const uriFinal = Platform.OS === 'android' ? localUri : localUri.replace('file://', '');

      const formData = new FormData();
      formData.append('foto', { uri: uriFinal, name: filename, type });

      const response = await api.patch("/usuarios/foto", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(response.data);
      Alert.alert("Sucesso", "Foto atualizada!");
    } catch (error) {
      console.log("Erro Upload:", error);
      Alert.alert("Erro", "Falha ao enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleChangePassword() {
    if (!senhaAtual || !novaSenha) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    setLoadingSenha(true);
    try {
      await api.patch("/usuarios/senha", { senhaAtual, novaSenha });
      Alert.alert("Sucesso", "Senha alterada com sucesso!");
      setModalVisible(false);
      setSenhaAtual("");
      setNovaSenha("");
    } catch (error) {
      const msg = error.response?.data?.error || "Erro ao alterar senha.";
      Alert.alert("Erro", msg);
    } finally {
      setLoadingSenha(false);
    }
  }

 // --- LOGOUT HÍBRIDO (WEB E MOBILE) ---
  function handleLogout() {
    // Se for Web (Navegador)
    if (Platform.OS === 'web') {
       const confirmou = window.confirm("Deseja realmente sair do aplicativo?");
       if (confirmou) {
         logout();
       }
       return;
    }
// Se for Celular (Android/iOS)
    Alert.alert("Sair", "Deseja realmente sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() }
    ]);
  }

  const imageUrl = user?.foto ? `${API_URL}/uploads/${user.foto}` : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.avatarWrapper}>
          {uploading ? (
             <View style={[styles.avatarContainer, styles.loadingAvatar]}><ActivityIndicator color="#fff" /></View>
          ) : imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
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
        <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Alterar Senha</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Configuracoes")}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Configurações</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
        <Text style={styles.logoutText}>Sair do Aplicativo</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textSecondary }]}>ClubFlow v1.0.1</Text>

      {/* MODAL SENHA */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Alterar Senha</Text>
            
            <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Senha Atual</Text>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
              secureTextEntry value={senhaAtual} onChangeText={setSenhaAtual} placeholderTextColor={colors.textSecondary} placeholder="Digite a senha atual"
            />

            <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Nova Senha</Text>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
              secureTextEntry value={novaSenha} onChangeText={setNovaSenha} placeholderTextColor={colors.textSecondary} placeholder="Nova senha forte"
            />
            <Text style={styles.hint}>Mín. 6 caracteres, 1 número, 1 maiúscula, 1 símbolo</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleChangePassword} disabled={loadingSenha}>
                {loadingSenha ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarContainer: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: "#008080", // <--- MUDOU DE AZUL PARA TEAL
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 5 
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  loadingAvatar: { backgroundColor: '#ccc' },
  avatarText: { fontSize: 36, color: "#fff", fontWeight: "bold" },
 editIconBadge: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#004d4d', // <--- MUDOU PARA UM TOM MAIS ESCURO DA MARCA
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2 
  },
  nome: { fontSize: 22, fontWeight: "bold" },
  email: { fontSize: 14, marginTop: 4 },
  section: { borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
  actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  actionText: { flex: 1, marginLeft: 16, fontSize: 16 },
  divider: { height: 1, marginVertical: 12 },
  logoutButton: { flexDirection: "row", backgroundColor: "#FDECEC", padding: 16, borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8 },
  logoutText: { color: "#E74C3C", fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", marginTop: 20, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  labelInput: { fontSize: 14, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  hint: { fontSize: 12, color: '#999', marginTop: 5, fontStyle: 'italic' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
});