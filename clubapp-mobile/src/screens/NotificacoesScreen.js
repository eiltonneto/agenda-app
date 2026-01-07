import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Alert, StyleSheet,
  ActivityIndicator, Platform, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext"; // <--- Importar Contexto

function exibirAlerta(t, m) { if (Platform.OS === 'web') window.alert(`${t}\n\n${m}`); else Alert.alert(t, m); }

export default function NotificacoesScreen() {
  const { theme, isDark } = useTheme(); // <--- Usar Tema
  const colors = theme.colors;

  const [loading, setLoading] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const carregarNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notificacoes"); 
      setNotificacoes(res.data);
      setSelectedIds([]);
    } catch (err) { console.log("Erro load notif"); } 
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { carregarNotificacoes(); }, [carregarNotificacoes]));

  async function handleCardPress(item) {
      if (selectedIds.length > 0) {
          toggleSelection(item.id);
          return;
      }

      if (!item.lida) {
          const novaLista = notificacoes.map(n => n.id === item.id ? { ...n, lida: true } : n);
          setNotificacoes(novaLista);
          try { await api.patch(`/notificacoes/${item.id}/lida`); } catch(e){}
      }
  }

  function toggleSelection(id) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  }
  function handleLongPress(item) { toggleSelection(item.id); }
  
  async function excluirSelecionados() {
      const confirmar = async () => {
        try {
            await api.post("/notificacoes/excluir-massa", { ids: selectedIds });
            carregarNotificacoes();
        } catch (e) { exibirAlerta("Erro", "Falha ao excluir"); }
      }

      if (Platform.OS === 'web') {
        if(window.confirm("Excluir selecionados?")) confirmar();
      } else {
        Alert.alert("Excluir", "Excluir selecionados?", [{text:"Cancelar"}, {text:"Sim", onPress: confirmar}]);
      }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      {selectedIds.length > 0 ? (
          <View style={[styles.headerSelection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedIds([])}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={[styles.textSelection, { color: colors.text }]}>{selectedIds.length}</Text>
              <TouchableOpacity onPress={excluirSelecionados}><Ionicons name="trash" size={24} color={colors.danger} /></TouchableOpacity>
          </View>
      ) : (
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
              <TouchableOpacity onPress={carregarNotificacoes}>
                  <Ionicons name="reload" size={20} color={colors.primary} />
              </TouchableOpacity>
          </View>
      )}

      {loading && !notificacoes.length ? (
          <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 20}} />
      ) : (
          <FlatList
            data={notificacoes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarNotificacoes} tintColor={colors.primary} />}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 50}}>
                    <Text style={{color: colors.textSecondary}}>Nenhuma notificação.</Text>
                </View>
            }
            renderItem={({ item }) => {
                const selecionado = selectedIds.includes(item.id);
                const iconName = item.tipo === 'DESPESA' ? "wallet-outline" : "calendar-outline";
                let dataF = "";
                try { dataF = format(parseISO(item.disparoEm), "dd/MM HH:mm", { locale: ptBR }); } catch(e){}

                return (
                    <TouchableOpacity
                        style={[
                            styles.card,
                            // Card Base (Surface)
                            { backgroundColor: colors.surface },
                            
                            // LIDA: Cinza ou Escuro (Sem borda)
                            item.lida && { backgroundColor: isDark ? '#1f1f1f' : '#EEEEEE', borderLeftWidth: 0, opacity: 0.7 },
                            
                            // NÃO LIDA: Branco ou Escuro Claro (Borda Azul)
                            !item.lida && { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary },
                            
                            // SELECIONADO: Azulzinho
                            selecionado && { backgroundColor: isDark ? '#1A3B5C' : '#D6EAF8', borderColor: colors.primary, borderWidth: 1, borderLeftWidth: 1 }
                        ]}
                        onPress={() => handleCardPress(item)}
                        onLongPress={() => handleLongPress(item)}
                        activeOpacity={0.8}
                    >
                        {selecionado ? (
                            <Ionicons name="checkmark-circle" size={28} color={colors.primary} style={{ marginRight: 12 }} />
                        ) : (
                            <View style={[styles.iconBox, { backgroundColor: item.lida ? (isDark ? '#333' : '#e0e0e0') : (isDark ? '#1A3B5C' : '#E3F2FD') }]}>
                                <Ionicons name={iconName} size={24} color={item.lida ? colors.textSecondary : colors.primary} />
                            </View>
                        )}

                        <View style={{ flex: 1 }}>
                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <Text style={[styles.titulo, { color: colors.text }, item.lida && { color: colors.textSecondary }]}>{item.titulo}</Text>
                                {!item.lida && !selecionado && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                            </View>
                            <Text style={[styles.mensagem, { color: colors.textSecondary }, item.lida && { color: isDark ? '#666' : '#888' }]} numberOfLines={2}>
                                {item.mensagem}
                            </Text>
                            <Text style={[styles.data, { color: colors.textSecondary }]}>{dataF}</Text>
                        </View>
                    </TouchableOpacity>
                );
            }}
          />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerSelection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  textSelection: { fontSize: 18, fontWeight: 'bold' },

  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  titulo: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  mensagem: { fontSize: 13, marginBottom: 6 },
  data: { fontSize: 11, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 }
});