import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { format, addDays, isBefore, isSameDay, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";

// Configuração do Calendário para Português
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

/* ======================
   TIPOS DE EVENTO
====================== */
const TIPOS = [
  { key: "RACHA", cor: "#0A7AFF" },
  { key: "EVENTO_CLUBE", cor: "#2ECC71" },
  { key: "MANUTENCAO", cor: "#E67E22" },
  { key: "FESTA", cor: "#9B59B6" },
  { key: "OUTRO", cor: "#95A5A6" },
];

const LEMBRETES = [
  { label: "24h antes", value: 1440 },
  { label: "5h antes", value: 300 },
  { label: "2h antes", value: 120 },
  { label: "1h antes", value: 60 },
  { label: "30 min antes", value: 30 },
];

/* ======================
   UTILIDADES
====================== */
function formatarHora(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 4);
  if (numeros.length <= 2) return numeros;
  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}

function horaValida(hora) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

// Função auxiliar para exibir alertas na Web e Mobile
function exibirAlerta(titulo, mensagem) {
    if (Platform.OS === 'web') {
        window.alert(`${titulo}\n\n${mensagem}`);
    } else {
        Alert.alert(titulo, mensagem);
    }
}

export default function AgendaScreen() {
  const hoje = new Date();
  const hojeISO = format(hoje, "yyyy-MM-dd");

  const [dataSelecionada, setDataSelecionada] = useState(hojeISO);
  const [visualizacao, setVisualizacao] = useState("DIA");
  const [eventos, setEventos] = useState([]);
  
  const [diasComEventos, setDiasComEventos] = useState({});

  const [modalVisivel, setModalVisivel] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  // --- ESTADOS PARA O PICKER DE DATA ---
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [pickerAno, setPickerAno] = useState(hoje.getFullYear());

  // --- SELEÇÃO MÚLTIPLA (NOVO) ---
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states Agenda
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState("RACHA");
  const [lembrete, setLembrete] = useState(null);

  // Estados para Integração Financeira
  const [gerarFinanceiro, setGerarFinanceiro] = useState(false);
  const [valorFinanceiro, setValorFinanceiro] = useState("");
  const [tipoFinanceiro, setTipoFinanceiro] = useState("RECEITA"); // 'RECEITA' ou 'DESPESA'
  
  const [loading, setLoading] = useState(false);

  /* ======================
     BUSCAR RESUMO (BOLINHAS)
  ====================== */
  async function carregarResumoMes(dataRef) {
    try {
      const res = await api.get(`/eventos/resumo-mes`, {
        params: { data: dataRef }
      });
      
      const listaDatas = res.data || [];
      const marcacoes = {};

      listaDatas.forEach((dia) => {
        marcacoes[dia] = {
          marked: true,
          dotColor: "#E67E22", 
        };
      });

      setDiasComEventos(marcacoes);
    } catch (err) {
      console.log("Erro ao carregar resumo do mês:", err);
    }
  }

  /* ======================
     BUSCAR EVENTOS (DETALHES)
  ====================== */
  async function carregarEventos() {
    try {
      const res = await api.get(`/eventos/dia/${dataSelecionada}`);
      setEventos(res.data || []);
      setSelectedIds([]); // Limpa seleção ao trocar o dia
    } catch (err) {
      console.log("Erro ao buscar eventos do dia");
    }
  }

  useEffect(() => {
    carregarEventos();
  }, [dataSelecionada]);

  useEffect(() => {
    carregarResumoMes(dataSelecionada);
  }, []);

  /* ======================
     LÓGICA DE SELEÇÃO MÚLTIPLA (NOVO)
  ====================== */
  function toggleSelection(id) {
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
        setSelectedIds([...selectedIds, id]);
    }
  }

  function handleCardPress(evento) {
    if (selectedIds.length > 0) {
        // Se já tem itens selecionados, o clique apenas seleciona/deseleciona
        toggleSelection(evento.id);
    } else {
        // Se não, comportamento normal de editar
        abrirEdicao(evento);
    }
  }

  function handleLongPress(evento) {
    // Segurou o dedo: inicia seleção
    toggleSelection(evento.id);
  }

  async function excluirSelecionados() {
    const msg = `Deseja excluir ${selectedIds.length} eventos?\n\nATENÇÃO: Os lançamentos financeiros vinculados também serão apagados.`;
    
    const confirmarExclusao = async () => {
        try {
            setLoading(true);
            // Chama a rota de exclusão em massa no backend
            await api.post("/eventos/excluir-massa", { ids: selectedIds });
            
            setSelectedIds([]);
            carregarEventos();
            carregarResumoMes(dataSelecionada);
        } catch (err) {
            exibirAlerta("Erro", "Falha ao excluir itens selecionados.");
        } finally {
            setLoading(false);
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm(msg)) confirmarExclusao();
    } else {
        Alert.alert("Excluir Vários", msg, [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: confirmarExclusao }
        ]);
    }
  }

  /* ======================
     MODAL & CRUD
  ====================== */
  function abrirCriacao() {
    setEventoEditando(null);
    setTitulo("");
    setInicio("");
    setFim("");
    setTipo("RACHA");
    setLembrete(null);
    
    // Resetar campos financeiros na criação
    setGerarFinanceiro(false);
    setValorFinanceiro("");
    setTipoFinanceiro("RECEITA");

    setModalVisivel(true);
  }

  function abrirEdicao(evento) {
    setEventoEditando(evento);
    setTitulo(evento.titulo);
    setInicio(format(new Date(evento.inicio), "HH:mm"));
    setFim(format(new Date(evento.fim), "HH:mm"));
    setTipo(evento.tipo);
    setLembrete(evento.lembreteMinutosAntes1 ?? null);
    
    setGerarFinanceiro(false);
    
    setModalVisivel(true);
  }

  async function salvarEvento() {
    if (!titulo.trim()) return exibirAlerta("Campo Obrigatório", "Por favor, digite um título.");
    if (!inicio.trim() || !fim.trim()) return exibirAlerta("Campo Obrigatório", "Preencha os horários.");
    if (!horaValida(inicio) || !horaValida(fim)) return exibirAlerta("Erro", "Horários inválidos.");

    const inicioDate = new Date(`${dataSelecionada}T${inicio}:00`);
    const fimDate = new Date(`${dataSelecionada}T${fim}:00`);

    if (fimDate <= inicioDate) return exibirAlerta("Erro", "O horário de término deve ser maior que o início.");

    // Validação Financeira
    let valorFloat = 0;
    if (gerarFinanceiro && !eventoEditando) {
        if (!valorFinanceiro.trim()) return exibirAlerta("Erro", "Informe o valor para o financeiro.");
        valorFloat = parseFloat(valorFinanceiro.replace(",", "."));
        if (isNaN(valorFloat) || valorFloat <= 0) return exibirAlerta("Erro", "Valor inválido.");
    }

    try {
      setLoading(true);
      const payload = {
        titulo,
        tipo,
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString(),
        lembreteMinutosAntes1: lembrete,
        // Dados financeiros
        gerarFinanceiro: (!eventoEditando && gerarFinanceiro),
        valor: valorFloat,
        tipoFinanceiro
      };

      if (eventoEditando) {
        await api.put(`/eventos/${eventoEditando.id}`, payload);
      } else {
        await api.post("/eventos", payload);
      }

      setModalVisivel(false);
      carregarEventos(); 
      carregarResumoMes(dataSelecionada); 
      
      if (!eventoEditando && gerarFinanceiro) {
          exibirAlerta("Sucesso", "Evento e financeiro criados!");
      }

    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao salvar evento";
      exibirAlerta("Erro", msg);
    } finally {
        setLoading(false);
    }
  }

  async function excluirEvento(id) {
    // Exclusão individual mantida
    const msg = "Deseja realmente excluir este evento? O financeiro vinculado também será apagado.";
    
    const confirmar = async () => {
        try {
            await api.delete(`/eventos/${id}`);
            carregarEventos(); 
            carregarResumoMes(dataSelecionada); 
        } catch (err) {
            exibirAlerta("Erro", "Não foi possível excluir.");
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm(msg)) confirmar();
        return;
    }

    Alert.alert("Excluir", msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: confirmar },
    ]);
  }

  /* ======================
     FUNÇÕES DO PICKER DE DATA
  ====================== */
  function abrirPickerData(dateString) {
    const d = new Date(dateString); 
    setPickerAno(d.getFullYear());
    setModalDataVisivel(true);
  }

  function selecionarMesAno(mesIndex) {
    let novaData = new Date(dataSelecionada);
    novaData = setYear(novaData, pickerAno);
    novaData = setMonth(novaData, mesIndex);
    novaData.setDate(1); 
    
    const novaDataISO = format(novaData, "yyyy-MM-dd");
    setDataSelecionada(novaDataISO);
    carregarResumoMes(novaDataISO);
    setModalDataVisivel(false);
  }

  /* ======================
     VISUALIZAÇÃO SEMANA
  ====================== */
  const semana = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const data = addDays(new Date(dataSelecionada), index);
      const dataISO = format(data, "yyyy-MM-dd");
      return {
        label: format(data, "EEEE dd/MM", { locale: ptBR }),
        eventos: eventos.filter((e) => e.inicio.startsWith(dataISO)),
      };
    });
  }, [eventos, dataSelecionada]);

  /* ======================
     RENDER
  ====================== */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f2' }} edges={["top"]}>
      
      {/* HEADER: OU SELEÇÃO OU CALENDÁRIO */}
      {selectedIds.length > 0 ? (
          <View style={styles.headerSelection}>
              <TouchableOpacity onPress={() => setSelectedIds([])}>
                  <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.textSelection}>{selectedIds.length} selecionado(s)</Text>
              <TouchableOpacity onPress={excluirSelecionados}>
                  <Ionicons name="trash" size={24} color="#E74C3C" />
              </TouchableOpacity>
          </View>
      ) : (
          <Calendar
            current={dataSelecionada}
            onMonthChange={(month) => {
               carregarResumoMes(month.dateString);
            }}
            onDayPress={(day) => setDataSelecionada(day.dateString)}
            markedDates={{
              ...diasComEventos, 
              [dataSelecionada]: {
                selected: true,
                selectedColor: "#0A7AFF",
                ...(diasComEventos[dataSelecionada] || {}),
              },
            }}
            theme={{
                todayTextColor: '#0A7AFF',
                arrowColor: '#0A7AFF',
                selectedDayBackgroundColor: '#0A7AFF',
                dotColor: '#E67E22',
                textMonthFontWeight: 'bold',
                textMonthFontSize: 16,
            }}
            renderHeader={(date) => {
                const d = new Date(date);
                const tituloMes = format(d, "MMMM yyyy", { locale: ptBR }).toUpperCase();
                return (
                    <TouchableOpacity onPress={() => abrirPickerData(d)}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold', color: '#0A7AFF'}}>
                                {tituloMes}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#0A7AFF" />
                        </View>
                    </TouchableOpacity>
                );
            }}
          />
      )}

      {selectedIds.length === 0 && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, visualizacao === "DIA" && styles.tabAtiva]}
              onPress={() => setVisualizacao("DIA")}
            >
              <Text style={visualizacao === "DIA" ? styles.textoTabAtiva : styles.textoTab}>Dia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, visualizacao === "SEMANA" && styles.tabAtiva]}
              onPress={() => setVisualizacao("SEMANA")}
            >
              <Text style={visualizacao === "SEMANA" ? styles.textoTabAtiva : styles.textoTab}>Semana</Text>
            </TouchableOpacity>
          </View>
      )}

      {/* Botão de adicionar some se estiver selecionando */}
      {selectedIds.length === 0 && (
          <TouchableOpacity style={styles.add} onPress={abrirCriacao}>
            <Text style={{ color: "#fff", fontWeight: 'bold' }}>+ Novo Evento</Text>
          </TouchableOpacity>
      )}

      <FlatList
        data={visualizacao === "DIA" ? eventos : semana}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        ListEmptyComponent={
            visualizacao === "DIA" && (
                <Text style={styles.vazio}>Nenhum evento neste dia.</Text>
            )
        }
        renderItem={({ item }) =>
          visualizacao === "DIA" ? (
            <EventoCard
              key={item.id}
              evento={item}
              // Passamos se está selecionado ou não
              selecionado={selectedIds.includes(item.id)}
              onPress={() => handleCardPress(item)}
              onLongPress={() => handleLongPress(item)}
              onDelete={excluirEvento}
            />
          ) : (
            <View>
              <Text style={styles.diaHeader}>{item.label}</Text>
              {item.eventos.length === 0 && <Text style={styles.semEventos}>Sem eventos</Text>}
              {item.eventos?.map((e) => (
                <EventoCard
                  key={e.id}
                  evento={e}
                  selecionado={selectedIds.includes(e.id)}
                  onPress={() => handleCardPress(e)}
                  onLongPress={() => handleLongPress(e)}
                  onDelete={excluirEvento}
                />
              ))}
            </View>
          )
        }
      />

      {/* --- MODAL DE CRIAÇÃO --- */}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalWrapper}
          >
            <View style={styles.modal}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>
                    {eventoEditando ? "Editar Evento" : "Novo Evento"}
                </Text>

                <Text style={styles.labelInput}>Título</Text>
                <TextInput
                  placeholder="Título do evento (ex: Racha do Neto)"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={titulo}
                  onChangeText={setTitulo}
                />

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.labelInput}>Início</Text>
                        <TextInput
                        placeholder="HHmm"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        style={styles.input}
                        value={inicio}
                        onChangeText={(v) => setInicio(formatarHora(v))}
                        />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.labelInput}>Fim</Text>
                        <TextInput
                        placeholder="HHmm"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        style={styles.input}
                        value={fim}
                        onChangeText={(v) => setFim(formatarHora(v))}
                        />
                    </View>
                </View>

                {/* --- INTEGRAÇÃO FINANCEIRA --- */}
                {!eventoEditando && (
                    <View style={styles.boxFinanceiro}>
                        <View style={styles.headerFinanceiro}>
                            <Text style={styles.labelFinanceiro}>Lançar no Financeiro?</Text>
                            <Switch 
                                value={gerarFinanceiro} 
                                onValueChange={setGerarFinanceiro}
                                trackColor={{ false: "#767577", true: "#2ECC71" }}
                                thumbColor={gerarFinanceiro ? "#fff" : "#f4f3f4"}
                            />
                        </View>

                        {gerarFinanceiro && (
                            <View>
                                <Text style={styles.labelInput}>Valor do Evento (R$)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="0.00" 
                                    keyboardType="numeric" 
                                    value={valorFinanceiro} 
                                    onChangeText={setValorFinanceiro} 
                                />
                                
                                <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.btnTipo, 
                                            tipoFinanceiro === 'RECEITA' && {backgroundColor: '#2ECC71', borderColor: '#2ECC71'}
                                        ]}
                                        onPress={() => setTipoFinanceiro('RECEITA')}
                                    >
                                        <Text style={{color: tipoFinanceiro === 'RECEITA' ? '#fff' : '#333', fontWeight: 'bold'}}>Entrada</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[
                                            styles.btnTipo, 
                                            tipoFinanceiro === 'DESPESA' && {backgroundColor: '#E74C3C', borderColor: '#E74C3C'}
                                        ]}
                                        onPress={() => setTipoFinanceiro('DESPESA')}
                                    >
                                        <Text style={{color: tipoFinanceiro === 'DESPESA' ? '#fff' : '#333', fontWeight: 'bold'}}>Saída</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <Text style={styles.label}>Categoria</Text>
                <View style={styles.tipos}>
                  {TIPOS.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setTipo(t.key)}
                      style={[
                        styles.tipo,
                        { backgroundColor: tipo === t.key ? t.cor : "#eee" },
                      ]}
                    >
                      <Text style={{ color: tipo === t.key ? "#fff" : "#000", fontSize: 12 }}>
                        {t.key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Lembrete</Text>
                <View style={styles.lembretes}>
                  {LEMBRETES.map((l) => (
                    <TouchableOpacity
                      key={l.value}
                      onPress={() => setLembrete(l.value)}
                      style={[
                        styles.lembrete,
                        {
                          backgroundColor:
                            lembrete === l.value ? "#0A7AFF" : "#eee",
                        },
                      ]}
                    >
                      <Text style={{ color: lembrete === l.value ? "#fff" : "#000", fontSize: 11 }}>
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                    style={[styles.criar, loading && {opacity: 0.7}]} 
                    onPress={loading ? null : salvarEvento}
                    disabled={loading}
                >
                  {loading ? (
                      <ActivityIndicator color="#fff" />
                  ) : (
                      <Text style={{ color: "#fff", fontWeight: 'bold' }}>
                        {eventoEditando ? "Salvar Alterações" : "Criar Evento"}
                      </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setModalVisivel(false)} disabled={loading}>
                  <Text style={styles.cancelar}>Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- NOVO MODAL: PICKER DE MÊS/ANO --- */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
        <View style={styles.overlay}>
            <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setPickerAno(pickerAno - 1)}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity>
                    <Text style={styles.pickerAnoTexto}>{pickerAno}</Text>
                    <TouchableOpacity onPress={() => setPickerAno(pickerAno + 1)}><Ionicons name="chevron-forward" size={24} color="#333" /></TouchableOpacity>
                </View>
                <View style={styles.mesesGrid}>
                    {LocaleConfig.locales['pt-br'].monthNamesShort.map((mes, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.mesBotao}
                            onPress={() => selecionarMesAno(index)}
                        >
                            <Text style={styles.mesTexto}>{mes.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={() => setModalDataVisivel(false)} style={styles.pickerFechar}>
                    <Text style={{color: "#E74C3C", fontWeight: 'bold'}}>Fechar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Card com suporte a seleção visual
function EventoCard({ evento, onPress, onLongPress, onDelete, selecionado }) {
  const cor = TIPOS.find((t) => t.key === evento.tipo)?.cor || "#ccc";
  
  const agora = new Date();
  const fimEvento = new Date(evento.fim);
  const jaPassou = fimEvento < agora;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        jaPassou && styles.cardPassado,
        selecionado && styles.cardSelecionado // Estilo de seleção
      ]} 
      onPress={jaPassou ? null : onPress} 
      onLongPress={jaPassou ? null : onLongPress} // Gesto para selecionar
      disabled={jaPassou} 
    >
      <View style={[styles.lateral, { backgroundColor: jaPassou ? "#999" : cor }]} />

      <View style={{ flex: 1 }}>
        <Text style={[styles.titulo, jaPassou && styles.textoPassado]}>
            {evento.titulo} {jaPassou && "(Encerrado)"}
        </Text>
        <Text style={[styles.horario, jaPassou && styles.textoPassado]}>
          {format(new Date(evento.inicio), "HH:mm")} - {format(new Date(evento.fim), "HH:mm")}
        </Text>
      </View>

      {/* Se selecionado, mostra check. Se não e não for passado, mostra lixeira */}
      {selecionado ? (
          <Ionicons name="checkmark-circle" size={24} color="#0A7AFF" />
      ) : (
          onDelete && !jaPassou && (
            <TouchableOpacity onPress={() => onDelete(evento.id)} style={{padding: 5}}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
          )
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Header de Seleção
  headerSelection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  textSelection: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  // Card Selecionado
  cardSelecionado: { backgroundColor: '#E3F2FD', borderColor: '#0A7AFF', borderWidth: 1 },
  
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  tabAtiva: {
    backgroundColor: "#0A7AFF",
    borderColor: '#0A7AFF',
  },
  textoTab: { color: '#333' },
  textoTabAtiva: { color: '#fff', fontWeight: 'bold' },
  add: {
    margin: 16,
    backgroundColor: "#0A7AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vazio: {
      textAlign: 'center',
      color: '#999',
      marginTop: 20,
  },
  diaHeader: {
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  semEventos: {
      color: '#ccc',
      fontStyle: 'italic',
      fontSize: 12,
      marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPassado: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  textoPassado: {
    color: '#999',
    textDecorationLine: 'none',
  },
  lateral: {
    width: 4,
    height: '100%',
    marginRight: 12,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  titulo: {
    fontWeight: "bold",
    fontSize: 15,
    color: '#333',
  },
  horario: {
      color: '#666',
      fontSize: 12,
      marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: "#333",
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: "#333",
  },
  row: {
      flexDirection: 'row',
      marginBottom: 4,
  },
  labelInput: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
      fontWeight: '600',
  },
  label: {
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 8,
    color: '#333',
  },
  tipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipo: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  lembretes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lembrete: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  criar: {
    backgroundColor: "#0A7AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  cancelar: {
    textAlign: "center",
    color: "#E74C3C",
    marginTop: 16,
    fontWeight: '600',
  },
  
  // Picker Styles
  pickerModal: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: 'center', width: '90%', alignSelf:'center' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  pickerAnoTexto: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  mesesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  mesBotao: { width: '30%', paddingVertical: 12, alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 8 },
  mesTexto: { fontWeight: 'bold', color: '#555' },
  pickerFechar: { marginTop: 20, padding: 10 },

  // Financeiro Styles
  boxFinanceiro: { backgroundColor: '#F0F8FF', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#D1E8FF' },
  headerFinanceiro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelFinanceiro: { fontWeight: 'bold', color: '#0056b3' },
  btnTipo: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' }
});