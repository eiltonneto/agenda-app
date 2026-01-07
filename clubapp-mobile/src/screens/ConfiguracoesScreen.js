import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Modal, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function ConfiguracoesScreen({ navigation }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const colors = theme.colors;

  const [notificacoesEnabled, setNotificacoesEnabled] = useState(true);
  
  // Estados para controlar os Modais
  const [modalTermosVisible, setModalTermosVisible] = useState(false);
  const [modalPrivacidadeVisible, setModalPrivacidadeVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* SEÇÃO APARÊNCIA */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowIconText}>
              <Ionicons name="moon-outline" size={22} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>Modo Escuro</Text>
            </View>
            <Switch 
              value={isDark} 
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={isDark ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* SEÇÃO NOTIFICAÇÕES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICAÇÕES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowIconText}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>Permitir Notificações</Text>
            </View>
            <Switch 
              value={notificacoesEnabled} 
              onValueChange={setNotificacoesEnabled}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={notificacoesEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* SEÇÃO LEGAL */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LEGAL</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          
          <TouchableOpacity style={styles.row} onPress={() => setModalTermosVisible(true)}>
            <Text style={[styles.label, { color: colors.text }]}>Termos de Uso</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity style={styles.row} onPress={() => setModalPrivacidadeVisible(true)}>
            <Text style={[styles.label, { color: colors.text }]}>Política de Privacidade</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Desenvolvido por Eilton Neto {'\n'} Versão 1.0.1
        </Text>

      </ScrollView>

      {/* --- MODAL TERMOS --- */}
      <Modal animationType="slide" transparent={true} visible={modalTermosVisible} onRequestClose={() => setModalTermosVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Termos de Uso</Text>
            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Bem-vindo ao YourFlow!{'\n\n'}
                1. O uso deste aplicativo é destinado ao gerenciamento pessoal e de Administradores.{'\n'}
                2. Todo o conteúdo e design são propriedade intelectual de Eilton Neto.{'\n'}
                3. O usuário concorda em utilizar o sistema de forma ética e responsável.{'\n'}
                Ao continuar, você concorda com estes termos.
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setModalTermosVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL PRIVACIDADE --- */}
      <Modal animationType="slide" transparent={true} visible={modalPrivacidadeVisible} onRequestClose={() => setModalPrivacidadeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Política de Privacidade</Text>
            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Esta política descreve como Eilton Neto utiliza seus dados:{'\n\n'}
                1. Coletamos apenas Nome, Email e Foto para personalização.{'\n'}
                2. Seus dados são protegidos e não compartilhados com terceiros sem consentimento.{'\n'}
                3. Para exclusão de dados, contate o desenvolvedor.
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setModalPrivacidadeVisible(false)}>
              <Text style={styles.closeButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  backButton: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: "bold" },
  
  // --- AQUI ESTÁ A MUDANÇA ---
  sectionTitle: { 
      fontSize: 13, 
      marginBottom: 8, 
      marginTop: 16, 
      fontWeight: 'bold', 
      marginLeft: 8 // Adicionei margem na esquerda para não ficar colado
  },
  
  card: { borderRadius: 12, padding: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowIconText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 16 },
  divider: { height: 1, marginVertical: 8 },
  version: { textAlign: 'center', marginTop: 30, fontSize: 12, lineHeight: 18 },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24, elevation: 5, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalText: { fontSize: 16, lineHeight: 24, textAlign: 'justify' },
  closeButton: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});