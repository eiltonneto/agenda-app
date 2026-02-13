import React, { useState } from "react";
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
  
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);

  const getIniciais = (nome) => {
    if (!nome) return "U";
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  async function handlePickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Precisamos acessar sua galeria para mudar a foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Reduzi levemente para melhorar o upload no backend
    });

    if (!result.canceled) {
      handleUploadPhoto(result.assets[0].uri);
    }
  }

  async function handleUploadPhoto(localUri) {
    setUploading(true);
    try {
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const uriFinal = Platform.OS === 'android' ? localUri : localUri.replace('file://', '');

      const formData = new FormData();
      formData.append('foto', { 
        uri: uriFinal, 
        name: filename, 
        type 
      });

      const response = await api.patch("/usuarios/foto", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser(response.data);
      Alert.alert("Sucesso", "Sua foto de perfil foi atualizada!");
    } catch (error) {
      console.error("Erro Upload:", error);
      Alert.alert("Erro", "Não conseguimos enviar sua foto. Verifique sua conexão.");
    } finally {
      setUploading(false);
    }
  }

  // Validação real de senha para evitar Erro 500 no Backend
  function validarSenha(senha) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return regex.test(senha);
  }

  async function handleChangePassword() {
    if (!senhaAtual || !novaSenha) {
      Alert.alert("Atenção", "Preencha os campos de senha.");
      return;
    }

    if (!validarSenha(novaSenha)) {
      Alert.alert("Senha Fraca", "A nova senha deve seguir os requisitos de segurança.");
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
      const msg = error.response?.data?.error || "Senha atual incorreta.";
      Alert.alert("Erro", msg);
    } finally {
      setLoadingSenha(false);
    }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
       if (window.confirm("Deseja realmente sair?")) logout();
       return;
    }

    Alert.alert("Sair", "Deseja realmente sair do ClubFlow?", [
      { text: "Ficar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() }
    ]);
  }

  const imageUrl = user?.foto ? `${API_URL}/uploads/${user.foto}` : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
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

        <Text style={[styles.version, { color: colors.textSecondary }]}>YourFlow v2.0.1</Text>
      </ScrollView>

      {/* MODAL SENHA - CORRIGIDO COMPORTAMENTO DE TECLADO */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Segurança</Text>
              
              <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Senha Atual</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
                secureTextEntry 
                value={senhaAtual} 
                onChangeText={setSenhaAtual} 
                placeholder="Sua senha atual"
                placeholderTextColor="#999"
              />

              <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Nova Senha</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
                secureTextEntry 
                value={novaSenha} 
                onChangeText={setNovaSenha} 
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#999"
              />
              <Text style={styles.hint}>* Use letras maiúsculas, números e símbolos.</Text>
              
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
    bottom: 5, 
    right: 5, 
    backgroundColor: '#004d4d', 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3,
    borderColor: '#fff'
  },
  nome: { fontSize: 24, fontWeight: "bold", letterSpacing: -0.5 },
  email: { fontSize: 14, marginTop: 2, opacity: 0.7 },
  section: { borderRadius: 20, padding: 20, marginBottom: 25, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1 },
  actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,128,128,0.1)', justifyContent: 'center', alignItems: 'center' },
  actionText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginVertical: 15, opacity: 0.3 },
  logoutButton: { flexDirection: "row", backgroundColor: "#FDECEC", padding: 18, borderRadius: 15, justifyContent: "center", alignItems: "center", gap: 10 },
  logoutText: { color: "#E74C3C", fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", marginTop: 25, fontSize: 12, opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalContent: { borderRadius: 24, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  labelInput: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 5 },
  hint: { fontSize: 11, color: '#999', marginTop: 8, fontStyle: 'italic' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 35 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', marginHorizontal: 6 },
});