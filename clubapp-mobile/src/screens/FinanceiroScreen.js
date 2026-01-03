import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, addMonths, subMonths, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";

const CATEGORIAS_DESPESA = ["FIXA", "VARIAVEL", "COMPRA_PRODUTO", "MANUTENCAO", "OUTRO"];
const TIPOS_RECEITA = ["VENDA", "SERVICO", "ALUGUEL", "OUTRO"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
});

export default function FinanceiroScreen() {
  const [loading, setLoading] = useState(false);
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState("DESPESA"); 
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [transacoes, setTransacoes] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  
  // Form States
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("OUTRO"); 
  const [dataVencimento, setDataVencimento] = useState(""); 
  const [status, setStatus] = useState("PENDENTE");

  function trocarAba(novaAba) {
    if (novaAba !== abaAtiva) {
      setTransacoes([]); 
      setAbaAtiva(novaAba);
    }
  }

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const mes = dataReferencia.getMonth() + 1;
      const ano = dataReferencia.getFullYear();

      // Busca Resumo (Agora traz só o REALIZADO)
      try {
        const resResumo = await api.get(`/financeiro/resumo`, { params: { mes, ano } });
        setResumo(resResumo.data);
      } catch (e) { console.log("Erro resumo", e); }

      // Busca Lista (Traz tudo para mostrar os pendentes)
      const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
      const resLista = await api.get(endpoint, { params: { mes, ano } });
      setTransacoes(Array.isArray(resLista.data) ? resLista.data : []);

    } catch (error) {
      console.log("Erro geral financeiro:", error);
    } finally {
      setLoading(false);
    }
  }, [dataReferencia, abaAtiva]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  function mudarMes(direcao) {
    setDataReferencia(prev => direcao === "anterior" ? subMonths(prev, 1) : addMonths(prev, 1));
  }

  async function toggleStatus(item) {
    try {
      const novoStatus = abaAtiva === "RECEITA" 
        ? (item.status === "RECEBIDA" ? "PENDENTE" : "RECEBIDA")
        : (item.status === "PAGA" ? "PENDENTE" : "PAGA");
      const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
      
      // Ao trocar o status, o backend atualiza e quando chamamos carregarDados(),
      // o saldo lá em cima vai mudar "verdadeiramente" como você pediu.
      await api.patch(`${endpoint}/${item.id}/status`, { status: novoStatus });
      carregarDados(); 
    } catch (error) { Alert.alert("Erro", "Erro ao atualizar status."); }
  }

  async function excluirItem(id) {
    Alert.alert("Excluir", "Confirmar exclusão?", [
      { text: "Não" },
      { text: "Sim", style: "destructive", onPress: async () => {
          try {
            const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
            await api.delete(`${endpoint}/${id}`);
            carregarDados();
          } catch (e) { Alert.alert("Erro", "Falha ao excluir."); }
        }
      }
    ]);
  }

  function abrirModal(item = null) {
    setTransacaoEditando(item);
    if (item) {
      setDescricao(item.descricao);
      setValor(String(item.valor));
      setCategoria(abaAtiva === "RECEITA" ? item.tipo : item.categoria);
      setStatus(item.status);
      const rawData = abaAtiva === "RECEITA" ? item.dataPrevista : item.dataVencimento;
      try {
         const d = parseISO(rawData);
         setDataVencimento(isValid(d) ? format(d, "yyyy-MM-dd") : "");
      } catch { setDataVencimento(""); }
    } else {
      setDescricao("");
      setValor("");
      setCategoria("OUTRO");
      setDataVencimento(format(new Date(), "yyyy-MM-dd"));
      setStatus("PENDENTE");
    }
    setModalVisivel(true);
  }

  async function salvar() {
    if (!descricao || !valor || !dataVencimento) return Alert.alert("Erro", "Preencha tudo.");
    try {
      const v = parseFloat(valor.replace(",", "."));
      const d = new Date(dataVencimento).toISOString();
      const payload = { descricao, valor: v, status };
      
      const endpoint = abaAtiva === "RECEITA" ? "/receitas" : "/despesas";
      if (abaAtiva === "RECEITA") payload.dataPrevista = d; else payload.dataVencimento = d;
      if (abaAtiva === "RECEITA") payload.tipo = categoria; else payload.categoria = categoria;

      if (transacaoEditando) await api.put(`${endpoint}/${transacaoEditando.id}`, payload);
      else await api.post(endpoint, payload);

      setModalVisivel(false);
      carregarDados();
    } catch (e) { Alert.alert("Erro", "Falha ao salvar."); }
  }

  const corAba = abaAtiva === "RECEITA" ? "#2ECC71" : "#E74C3C";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header Mes */}
      <View style={styles.headerMes}>
        <TouchableOpacity onPress={() => mudarMes("anterior")}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.textoMes}>
          {format(dataReferencia, "MMMM yyyy", { locale: ptBR }).toUpperCase()}
        </Text>
        <TouchableOpacity onPress={() => mudarMes("proximo")}>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Dashboard */}
      <View style={styles.cardResumo}>
        {/* Título alterado para refletir a realidade */}
        <Text style={styles.labelSaldo}>Saldo em Caixa (Realizado)</Text>
        <Text style={[styles.valorSaldo, { color: resumo.saldo >= 0 ? "#2ECC71" : "#E74C3C" }]}>
          {currencyFormatter.format(resumo.saldo)}
        </Text>
        <View style={styles.rowResumo}>
          <View style={styles.itemResumo}>
            <Text style={styles.labelResumo}>Entradas</Text>
            <Text style={styles.valorResumo}>{currencyFormatter.format(resumo.receitas)}</Text>
          </View>
          <View style={styles.itemResumo}>
            <Text style={styles.labelResumo}>Saídas</Text>
            <Text style={styles.valorResumo}>{currencyFormatter.format(resumo.despesas)}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, abaAtiva === "DESPESA" && styles.tabAtivaDespesa]} onPress={() => trocarAba("DESPESA")}>
          <Text style={[styles.tabTexto, abaAtiva === "DESPESA" && {color:"#fff"}]}>SAÍDAS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, abaAtiva === "RECEITA" && styles.tabAtivaReceita]} onPress={() => trocarAba("RECEITA")}>
          <Text style={[styles.tabTexto, abaAtiva === "RECEITA" && {color:"#fff"}]}>ENTRADAS</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? <ActivityIndicator size="large" color={corAba} style={{marginTop:20}} /> : (
        <FlatList
          data={transacoes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum lançamento.</Text>}
          renderItem={({ item }) => {
            const isRec = abaAtiva === "RECEITA";
            const isDone = item.status === "PAGA" || item.status === "RECEBIDA";
            
            const rawData = isRec ? item.dataPrevista : item.dataVencimento;
            let dataFormatada = "--/--";
            
            if (rawData) {
                try {
                    const dataObj = parseISO(rawData);
                    if (isValid(dataObj)) dataFormatada = format(dataObj, "dd/MM");
                } catch (e) {}
            }

            // --- CÁLCULO DE PREVISÃO ---
            // Pega o saldo atual (que vem do backend já filtrado)
            const saldoAtual = Number(resumo.saldo);
            const valorItem = Number(item.valor);
            
            // Calcula qual SERIA o saldo se esse item fosse confirmado
            // Se estou vendo uma receita pendente: Saldo Atual + Receita
            // Se estou vendo uma despesa pendente: Saldo Atual - Despesa
            const saldoPrevisto = isRec 
                ? saldoAtual + valorItem 
                : saldoAtual - valorItem;

            return (
              <View style={[styles.cardItem, isDone && styles.cardItemDone]}>
                <TouchableOpacity onPress={() => toggleStatus(item)}>
                  <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={28} color={isDone ? (isRec ? "#2ECC71" : "#E74C3C") : "#ccc"} />
                </TouchableOpacity>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.descItem, isDone && styles.textDone]}>{item.descricao}</Text>
                  
                  <Text style={styles.catItem}>{isRec ? item.tipo : item.categoria} • {dataFormatada}</Text>
                  
                  {/* MENSAGEM INTELIGENTE DE PREVISÃO */}
                  {!isDone && (
                    <Text style={{ fontSize: 10, color: '#F39C12', marginTop: 4, fontWeight: 'bold' }}>
                       Previsto: {currencyFormatter.format(saldoPrevisto)}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Text style={[styles.valorItem, { color: isRec ? "#2ECC71" : "#E74C3C" }, isDone && styles.textDone]}>
                    {currencyFormatter.format(item.valor)}
                  </Text>
                  <View style={{flexDirection:'row', gap:12}}>
                      <TouchableOpacity onPress={() => abrirModal(item)}><Ionicons name="pencil" size={18} color="#666"/></TouchableOpacity>
                      <TouchableOpacity onPress={() => excluirItem(item.id)}><Ionicons name="trash-outline" size={18} color="#E74C3C"/></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: corAba }]} onPress={() => abrirModal(null)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: corAba}]}>{transacaoEditando ? "Editar" : "Nova"} {abaAtiva}</Text>
            <ScrollView>
                <Text style={styles.lbl}>Descrição</Text>
                <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Ex: Conta de Luz" />
                <View style={{flexDirection:'row', gap:10}}>
                    <View style={{flex:1}}>
                        <Text style={styles.lbl}>Valor</Text>
                        <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="numeric" placeholder="0.00"/>
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.lbl}>Data (AAAA-MM-DD)</Text>
                        <TextInput style={styles.input} value={dataVencimento} onChangeText={setDataVencimento} placeholder="2025-10-01"/>
                    </View>
                </View>
                <Text style={styles.lbl}>Categoria</Text>
                <View style={{flexDirection:'row', flexWrap:'wrap', gap:5, marginBottom:10}}>
                    {(abaAtiva === "RECEITA" ? TIPOS_RECEITA : CATEGORIAS_DESPESA).map(c => (
                        <TouchableOpacity key={c} onPress={()=>setCategoria(c)} style={[styles.chip, categoria===c && {backgroundColor:corAba}]}>
                            <Text style={{color: categoria===c ? "#fff":"#333", fontSize:10}}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                 <Text style={styles.lbl}>Status Inicial</Text>
                 <View style={{flexDirection:'row', gap: 10, marginBottom: 20}}>
                    <TouchableOpacity onPress={()=>setStatus('PENDENTE')} style={[styles.chip, status==='PENDENTE' && {backgroundColor:'#999'}]}>
                        <Text style={{color:'#fff'}}>Pendente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setStatus(abaAtiva === "RECEITA" ? "RECEBIDA" : "PAGA")} style={[styles.chip, status!=='PENDENTE' && {backgroundColor:corAba}]}>
                        <Text style={{color:'#fff'}}>Confirmado</Text>
                    </TouchableOpacity>
                 </View>

                <TouchableOpacity style={[styles.btn, {backgroundColor:corAba}]} onPress={salvar}><Text style={{color:"#fff", fontWeight:'bold'}}>SALVAR</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisivel(false)} style={{alignItems:'center', marginTop:10}}><Text style={{color:"red"}}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F2" },
  headerMes: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff" },
  textoMes: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cardResumo: { backgroundColor: "#fff", margin: 16, padding: 20, borderRadius: 12, alignItems: "center", elevation: 2 },
  labelSaldo: { fontSize: 14, color: "#666", marginBottom: 4 },
  valorSaldo: { fontSize: 32, fontWeight: "bold", marginBottom: 20 },
  rowResumo: { flexDirection: "row", width: "100%", justifyContent: "space-around" },
  itemResumo: { alignItems: "center" },
  labelResumo: { fontSize: 12, color: "#666" },
  valorResumo: { fontSize: 16, fontWeight: "bold", marginTop: 4, color: "#333" },
  tabsContainer: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: "#fff", borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6 },
  tabAtivaDespesa: { backgroundColor: "#E74C3C" },
  tabAtivaReceita: { backgroundColor: "#2ECC71" },
  tabTexto: { fontWeight: "bold", color: "#666", fontSize: 12 },
  vazio: { textAlign: "center", marginTop: 40, color: "#999" },
  cardItem: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 10, borderRadius: 10 },
  cardItemDone: { opacity: 0.6, backgroundColor: "#f9f9f9" },
  textDone: { textDecorationLine: "line-through", color: "#999" },
  descItem: { fontWeight: "bold", fontSize: 14, color: "#333" },
  catItem: { fontSize: 12, color: "#999", marginTop: 2 },
  valorItem: { fontWeight: "bold", fontSize: 14 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 5 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  lbl: { fontSize: 12, color: "#666", marginBottom: 4, fontWeight: "600" },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#eee" },
  chip: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#eee", borderRadius: 20 },
  btn: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 10 },
});