import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, addMonths, subMonths, isValid, parseISO, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext"; // <--- 1. Importar Tema

const CATEGORIAS_DESPESA = ["FIXA", "VARIAVEL", "COMPRA_PRODUTO", "MANUTENCAO", "OUTRO"];
const TIPOS_RECEITA = ["VENDA", "SERVICO", "ALUGUEL", "OUTRO"];
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function exibirAlerta(titulo, mensagem) {
    if (Platform.OS === 'web') {
        window.alert(`${titulo}\n\n${mensagem}`);
    } else {
        Alert.alert(titulo, mensagem);
    }
}

export default function FinanceiroScreen() {
  // --- TEMA ---
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(false);
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState("DESPESA"); 
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [transacoes, setTransacoes] = useState([]);
  
  const [selectedIds, setSelectedIds] = useState([]);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [pickerAno, setPickerAno] = useState(new Date().getFullYear());

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("OUTRO"); 
  const [dataVencimento, setDataVencimento] = useState(""); 
  const [status, setStatus] = useState("PENDENTE");

  function trocarAba(novaAba) { 
      if (novaAba !== abaAtiva) { 
          setTransacoes([]); 
          setSelectedIds([]); 
          setAbaAtiva(novaAba); 
      } 
  }
  function mudarMes(direcao) { if (direcao === "anterior") setDataReferencia(subMonths(dataReferencia, 1)); else setDataReferencia(addMonths(dataReferencia, 1)); }
  function abrirPickerData() { setPickerAno(dataReferencia.getFullYear()); setModalDataVisivel(true); }
  function selecionarMesAno(mesIndex) { let novaData = new Date(dataReferencia); novaData = setYear(novaData, pickerAno); novaData = setMonth(novaData, mesIndex); setDataReferencia(novaData); setModalDataVisivel(false); }

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const mes = dataReferencia.getMonth() + 1; const ano = dataReferencia.getFullYear();
      try { const resResumo = await api.get(`/financeiro/resumo`, { params: { mes, ano } }); setResumo(resResumo.data); } catch (e) { console.log(e); }
      const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
      const resLista = await api.get(endpoint, { params: { mes, ano } });
      setTransacoes(Array.isArray(resLista.data) ? resLista.data : []);
      setSelectedIds([]); 
    } catch (error) { console.log(error); } finally { setLoading(false); }
  }, [dataReferencia, abaAtiva]);

  useFocusEffect(useCallback(() => { carregarDados(); }, [carregarDados]));

  function toggleSelection(id) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  }

  function handleCardPress(item) {
      if (selectedIds.length > 0) toggleSelection(item.id);
      else toggleStatus(item); 
  }

  function handleLongPress(item) {
      toggleSelection(item.id);
  }

  async function toggleStatus(item) {
    try {
      const novoStatus = abaAtiva === "RECEITA" ? (item.status === "RECEBIDA" ? "PENDENTE" : "RECEBIDA") : (item.status === "PAGA" ? "PENDENTE" : "PAGA");
      const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
      await api.patch(`${endpoint}/${item.id}/status`, { status: novoStatus }); carregarDados(); 
    } catch (error) { exibirAlerta("Erro", "Não foi possível atualizar o status."); }
  }

  async function excluirSelecionados() {
      const endpoint = "/financeiro/excluir-massa";
      const confirmar = async () => {
          try {
              await api.post(endpoint, { ids: selectedIds, tipo: abaAtiva });
              setSelectedIds([]);
              carregarDados();
          } catch (e) { exibirAlerta("Erro", "Falha na exclusão em massa."); }
      };

      if (Platform.OS === 'web') {
          if (window.confirm(`Deseja excluir ${selectedIds.length} itens?`)) confirmar();
      } else {
          Alert.alert("Excluir", `Deseja apagar ${selectedIds.length} itens?`, [{ text: "Cancelar" }, { text: "Sim", style: "destructive", onPress: confirmar }]);
      }
  }

  async function excluirItemIndividual(id) {
      const confirmar = async () => {
          try {
              const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
              await api.delete(`${endpoint}/${id}`);
              carregarDados();
          } catch(e) { exibirAlerta("Erro", "Falha ao excluir item."); }
      };

      if (Platform.OS === 'web') {
          if (window.confirm("Deseja realmente excluir este lançamento?")) confirmar();
      } else {
          Alert.alert("Excluir", "Deseja realmente excluir este lançamento?", [{text: "Cancelar"}, {text: "Excluir", style: "destructive", onPress: confirmar}]);
      }
  }

  function abrirModalCriacao() { setTransacaoEditando(null); setDescricao(""); setValor(""); setCategoria("OUTRO"); setDataVencimento(format(new Date(), "yyyy-MM-dd")); setStatus("PENDENTE"); setModalVisivel(true); }
  
  function abrirModalEdicao(item) {
    if (selectedIds.length > 0) return; 
    setTransacaoEditando(item); setDescricao(item.descricao); setValor(String(item.valor)); setCategoria(abaAtiva === "RECEITA" ? item.tipo : item.categoria); setStatus(item.status);
    const rawData = abaAtiva === "RECEITA" ? item.dataPrevista : item.dataVencimento;
    try { const d = parseISO(rawData); setDataVencimento(isValid(d) ? format(d, "yyyy-MM-dd") : ""); } catch { setDataVencimento(""); }
    setModalVisivel(true);
  }

  async function salvarTransacao() {
    if (!descricao.trim()) return exibirAlerta("Atenção", "Digite uma descrição.");
    if (!valor) return exibirAlerta("Atenção", "Digite o valor.");
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRegex.test(dataVencimento)) return exibirAlerta("Erro", "Data inválida. Use AAAA-MM-DD.");
    const valorFloat = parseFloat(valor.replace(",", "."));
    if (isNaN(valorFloat) || valorFloat <= 0) return exibirAlerta("Erro", "O valor deve ser maior que zero.");

    try {
      const payload = { descricao, valor: valorFloat, status };
      const dataISO = new Date(dataVencimento).toISOString();

      if (abaAtiva === "RECEITA") {
        payload.dataPrevista = dataISO; payload.tipo = categoria; 
        if (transacaoEditando) await api.put(`/receitas/${transacaoEditando.id}`, payload); else await api.post("/receitas", payload);
      } else {
        payload.dataVencimento = dataISO; payload.categoria = categoria;
        if (transacaoEditando) await api.put(`/despesas/${transacaoEditando.id}`, payload); else await api.post("/despesas", payload);
      }
      setModalVisivel(false); carregarDados();
    } catch (e) { exibirAlerta("Erro", "Falha ao salvar."); }
  }

  function formatarDataVisual(dataISO) { if (!dataISO) return "--/--"; const [ano, mes, dia] = dataISO.split('T')[0].split('-'); return `${dia}/${mes}`; }
  const corAba = abaAtiva === "RECEITA" ? "#26A69A" : "#EF5350";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      
      {/* HEADER DINÂMICO (SELEÇÃO) */}
      {selectedIds.length > 0 ? (
          <View style={[styles.headerSelection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedIds([])}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={[styles.textSelection, { color: colors.text }]}>{selectedIds.length} selecionado(s)</Text>
              <TouchableOpacity onPress={excluirSelecionados}><Ionicons name="trash" size={24} color={colors.danger} /></TouchableOpacity>
          </View>
      ) : (
          <View style={[styles.headerMes, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => mudarMes("anterior")}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={abrirPickerData}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                    <Text style={[styles.textoMes, { color: colors.text }]}>{format(dataReferencia, "MMMM yyyy", { locale: ptBR }).toUpperCase()}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.text} />
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => mudarMes("proximo")}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
          </View>
      )}

      {selectedIds.length === 0 && (
          <View style={[styles.cardResumo, { backgroundColor: colors.surface }]}>
            <Text style={[styles.labelSaldo, { color: colors.textSecondary }]}>Saldo em Caixa (Realizado)</Text>
            <Text style={[styles.valorSaldo, { color: resumo.saldo >= 0 ? "#2ECC71" : "#E74C3C" }]}>{currencyFormatter.format(resumo.saldo)}</Text>
            <View style={styles.rowResumo}>
              <View style={styles.itemResumo}><Text style={[styles.labelResumo, { color: colors.textSecondary }]}>Entradas</Text><Text style={[styles.valorResumo, { color: colors.text }]}>{currencyFormatter.format(resumo.receitas)}</Text></View>
              <View style={styles.itemResumo}><Text style={[styles.labelResumo, { color: colors.textSecondary }]}>Saídas</Text><Text style={[styles.valorResumo, { color: colors.text }]}>{currencyFormatter.format(resumo.despesas)}</Text></View>
            </View>
          </View>
      )}

      {selectedIds.length === 0 && (
          <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={[styles.tab, abaAtiva === "DESPESA" && styles.tabAtivaDespesa]} onPress={() => trocarAba("DESPESA")}><Text style={[styles.tabTexto, {color: colors.text}, abaAtiva === "DESPESA" && {color:"#fff"}]}>SAÍDAS</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, abaAtiva === "RECEITA" && styles.tabAtivaReceita]} onPress={() => trocarAba("RECEITA")}><Text style={[styles.tabTexto, {color: colors.text}, abaAtiva === "RECEITA" && {color:"#fff"}]}>ENTRADAS</Text></TouchableOpacity>
          </View>
      )}

      {loading ? <ActivityIndicator size="large" color={corAba} style={{marginTop:20}} /> : (
        <FlatList data={transacoes} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} 
        ListEmptyComponent={<Text style={[styles.vazio, { color: colors.textSecondary }]}>Nenhum lançamento.</Text>} 
        renderItem={({ item }) => {
            const isRec = abaAtiva === "RECEITA"; const isDone = item.status === "PAGA" || item.status === "RECEBIDA";
            const rawData = isRec ? item.dataPrevista : item.dataVencimento; const dataFormatada = formatarDataVisual(rawData);
            const saldoPrevisto = isRec ? Number(resumo.saldo) + Number(item.valor) : Number(resumo.saldo) - Number(item.valor);
            
            const selecionado = selectedIds.includes(item.id);

            return (
              <TouchableOpacity 
                style={[
                    styles.cardItem, 
                    { backgroundColor: colors.surface },
                    isDone && { backgroundColor: isDark ? '#1f1f1f' : '#f9f9f9', opacity: 0.7 },
                    selecionado && { backgroundColor: isDark ? '#1A3B5C' : '#E3F2FD', borderColor: colors.primary, borderWidth: 1 }
                ]}
                onPress={() => handleCardPress(item)}
                onLongPress={() => handleLongPress(item)}
              >
                {selecionado ? (
                    <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                ) : (
                    <TouchableOpacity onPress={() => toggleStatus(item)} style={styles.iconStatus}>
                        <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={28} color={isDone ? (isRec ? "#2ECC71" : "#E74C3C") : "#ccc"} />
                    </TouchableOpacity>
                )}

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.descItem, { color: colors.text }, isDone && styles.textDone]}>{item.descricao}</Text>
                  <Text style={[styles.catItem, { color: colors.textSecondary }]}>{isRec ? item.tipo : item.categoria} • {dataFormatada}</Text>
                  {!isDone && (<Text style={{ fontSize: 10, color: '#F39C12', marginTop: 4, fontWeight: 'bold' }}>Previsto: {currencyFormatter.format(saldoPrevisto)}</Text>)}
                </View>
                <View style={{ alignItems: "flex-end", gap: 10 }}>
                  <Text style={[styles.valorItem, { color: isRec ? "#2ECC71" : "#E74C3C" }, isDone && styles.textDone]}>{currencyFormatter.format(item.valor)}</Text>
                  
                  {!selecionado && selectedIds.length === 0 && (
                      <View style={{ flexDirection: 'row', gap: 15 }}>
                          <TouchableOpacity onPress={() => abrirModalEdicao(item)}><Ionicons name="pencil" size={18} color={colors.textSecondary} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => excluirItemIndividual(item.id)}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
                      </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      
      {selectedIds.length === 0 && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: corAba }]} onPress={abrirModalCriacao}><Ionicons name="add" size={30} color="#fff" /></TouchableOpacity>
      )}

      {/* MODAL TRANSAÇÃO */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: corAba }]}>{transacaoEditando ? "Editar" : "Nova"} {abaAtiva === "RECEITA" ? "Receita" : "Despesa"}</Text>
            <ScrollView>
                <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Descrição</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} value={descricao} onChangeText={setDescricao} placeholder="Ex: Conta de Luz" placeholderTextColor={colors.textSecondary}/>
                
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Valor (R$)</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} value={valor} onChangeText={setValor} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textSecondary}/>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Data (AAAA-MM-DD)</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]} value={dataVencimento} onChangeText={setDataVencimento} placeholder="2026-01-20" placeholderTextColor={colors.textSecondary}/>
                    </View>
                </View>

                <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Categoria</Text>
                <View style={styles.chipsContainer}>
                    {(abaAtiva === "RECEITA" ? TIPOS_RECEITA : CATEGORIAS_DESPESA).map((cat) => (
                        <TouchableOpacity key={cat} style={[styles.chip, { backgroundColor: isDark ? '#333' : '#eee' }, categoria === cat && { backgroundColor: corAba }]} onPress={() => setCategoria(cat)}>
                            <Text style={[styles.chipText, { color: colors.text }, categoria === cat && { color: "#fff" }]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Status</Text>
                <View style={styles.chipsContainer}>
                    <TouchableOpacity style={[styles.chip, { backgroundColor: isDark ? '#333' : '#eee' }, status === "PENDENTE" && { backgroundColor: "#999" }]} onPress={() => setStatus("PENDENTE")}>
                        <Text style={{ color: status === "PENDENTE" ? "#fff" : colors.text }}>Pendente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.chip, { backgroundColor: isDark ? '#333' : '#eee' }, status !== "PENDENTE" && { backgroundColor: corAba }]} onPress={() => setStatus(abaAtiva === "RECEITA" ? "RECEBIDA" : "PAGA")}>
                        <Text style={{ color: status !== "PENDENTE" ? "#fff" : colors.text }}>{abaAtiva === "RECEITA" ? "Recebido" : "Pago"}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: corAba }]} onPress={salvarTransacao}><Text style={styles.txtSalvar}>{transacaoEditando ? "Atualizar" : "Salvar"}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisivel(false)}><Text style={[styles.txtCancelar, { color: colors.textSecondary }]}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PICKER DATA */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
          <View style={styles.overlayCentralizado}>
              <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
                  <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setPickerAno(pickerAno - 1)}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
                      <Text style={[styles.pickerAnoTexto, { color: colors.text }]}>{pickerAno}</Text>
                      <TouchableOpacity onPress={() => setPickerAno(pickerAno + 1)}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity>
                  </View>
                  <View style={styles.mesesGrid}>
                      {MESES_CURTOS.map((mes, index) => (
                          <TouchableOpacity key={index} style={[styles.mesBotao, { backgroundColor: isDark ? '#333' : '#f2f2f2' }]} onPress={() => selecionarMesAno(index)}>
                              <Text style={[styles.mesTexto, { color: colors.text }]}>{mes.toUpperCase()}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
                  <TouchableOpacity onPress={() => setModalDataVisivel(false)} style={styles.pickerFechar}><Text style={{color: colors.danger, fontWeight: 'bold'}}>Fechar</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSelection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  textSelection: { fontSize: 18, fontWeight: 'bold' },
  
  headerMes: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  textoMes: { fontSize: 16, fontWeight: "bold" },
  cardResumo: { margin: 16, padding: 20, borderRadius: 12, alignItems: "center", elevation: 2 },
  labelSaldo: { fontSize: 14, marginBottom: 4 },
  valorSaldo: { fontSize: 32, fontWeight: "bold", marginBottom: 20 },
  rowResumo: { flexDirection: "row", width: "100%", justifyContent: "space-around" },
  itemResumo: { alignItems: "center" },
  labelResumo: { fontSize: 12 },
  valorResumo: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  tabsContainer: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, borderRadius: 8, padding: 4 },
  tab: { 
    flex: 1, paddingVertical: 10,
     alignItems: "center", 
     borderRadius: 6
   },

  tabAtivaDespesa: { 
    backgroundColor:
     "#EF5350"
   },

  tabAtivaReceita: { 
    backgroundColor: "#26A69A"
  },
  tabTexto: { 
    fontWeight: "bold", 
    fontSize: 12 
  },
  vazio: { textAlign: "center", marginTop: 40 },
  cardItem: { flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 10, borderRadius: 10 },
  textDone: { textDecorationLine: "line-through", color: "#999" },
  descItem: { fontWeight: "bold", fontSize: 14 },
  catItem: { fontSize: 12, marginTop: 2 },
  valorItem: { fontWeight: "bold", fontSize: 14 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 5 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  overlayCentralizado: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: 'center' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  labelInput: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input: { borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  chipText: { fontSize: 12 },
  btnSalvar: { padding: 16, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  txtSalvar: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  txtCancelar: { textAlign: "center", padding: 10 },
  pickerModal: { borderRadius: 16, padding: 20, alignItems: 'center', width: '90%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  pickerAnoTexto: { fontSize: 22, fontWeight: 'bold' },
  mesesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  mesBotao: { width: '30%', paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  mesTexto: { fontWeight: 'bold' },
  pickerFechar: { marginTop: 20, padding: 10 },
});