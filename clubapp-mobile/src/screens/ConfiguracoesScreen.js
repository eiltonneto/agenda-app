import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Modal, SafeAreaView, Switch 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function ConfiguracoesScreen({ navigation }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const colors = theme.colors;

  // Estados dos Modais
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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* SEÇÃO APARÊNCIA */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowIconText}>
              <Ionicons name={isDark ? "moon" : "sunny-outline"} size={22} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>Modo Escuro</Text>
            </View>

            {/* SWITCH NATIVO DO SISTEMA */}
            <Switch
              trackColor={{ false: "#cbd5e1", true: colors.primary + "80" }}
              thumbColor={isDark ? colors.primary : "#f1f5f9"}
              ios_backgroundColor="#cbd5e1"
              onValueChange={toggleTheme}
              value={isDark}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }} 
            />
          </View>
        </View>

        {/* SEÇÃO LEGAL */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LEGAL</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          
          <TouchableOpacity style={styles.row} onPress={() => setModalTermosVisible(true)}>
            <View style={styles.rowIconText}>
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                <Text style={[styles.label, { color: colors.text }]}>Termos de Uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity style={styles.row} onPress={() => setModalPrivacidadeVisible(true)}>
             <View style={styles.rowIconText}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
                <Text style={[styles.label, { color: colors.text }]}>Política de Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Desenvolvido por Eilton Neto {'\n'} YourFlow Versão 3.0.1
        </Text>

      </ScrollView>

      {/* --- MODAL TERMOS DE USO --- */}
      <Modal animationType="slide" transparent={true} visible={modalTermosVisible} onRequestClose={() => setModalTermosVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Termos de Uso</Text>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Bem-vindo ao YourFlow!{'\n\n'}
                1. O uso deste aplicativo é destinado ao gerenciamento pessoal e administrativo.{'\n\n'}
                2. Todo o conteúdo e design são propriedade intelectual de Eilton Neto.{'\n\n'}
                3. O usuário concorda em utilizar o sistema de forma ética e responsável, especialmente no gerenciamento de eventos e finanças.{'\n\n'}
                4. O desenvolvedor não se responsabiliza por dados inseridos incorretamente pelo usuário.{'\n\n'}
                Ao continuar, você concorda com estes termos.
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setModalTermosVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL POLÍTICA DE PRIVACIDADE --- */}
      <Modal animationType="slide" transparent={true} visible={modalPrivacidadeVisible} onRequestClose={() => setModalPrivacidadeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Privacidade e Dados</Text>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Sua privacidade é prioridade no YourFlow:{'\n\n'}
                1. Coletamos Nome, Email e Foto de Perfil apenas para identificação e personalização da sua experiência.{'\n\n'}
                2. Seus lançamentos financeiros e de agenda são armazenados de forma segura e não são compartilhados com terceiros.{'\n\n'}
                3. Utilizamos armazenamento local (AsyncStorage) para salvar suas preferências de tema e categorias.{'\n\n'}
                4. Para solicitar a exclusão total da sua conta e dados, entre em contato através das configurações de perfil.{'\n'}
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
  sectionTitle: { fontSize: 13, marginBottom: 8, marginTop: 16, fontWeight: 'bold', marginLeft: 8 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowIconText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginVertical: 8, opacity: 0.5 },
  version: { textAlign: 'center', marginTop: 40, fontSize: 12, lineHeight: 18, opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalContent: { borderRadius: 24, padding: 25, elevation: 10, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  modalText: { fontSize: 15, lineHeight: 22, textAlign: 'justify' },
  closeButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 25 },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});