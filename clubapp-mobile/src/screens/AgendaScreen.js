import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext"; 
import { agendarLembreteData } from "../services/NotificationService";
import {
  View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, StyleSheet, ScrollView, Switch, ActivityIndicator
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { format, addDays, setMonth, setYear } from "date-fns";
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
  { key: "RACHA", cor: "#008080" },        
  { key: "EVENTO_CLUBE", cor: "#2E8B57" }, 
  { key: "MANUTENCAO", cor: "#DAA520" },   
  { key: "FESTA", cor: "#20B2AA" },        
  { key: "OUTRO", cor: "#708090" },        
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

function exibirAlerta(titulo, mensagem) {
    if (Platform.OS === 'web') {
        window.alert(`${titulo}\n\n${mensagem}`);
    } else {
        Alert.alert(titulo, mensagem);
    }
}

// --- CORREÇÃO DE FUSO HORÁRIO ---
function fixDateFromDB(isoString) {
    if (!isoString) return new Date();
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date;
}

function prepareDateForDB(dateStr, timeStr) {
    const date = new Date(`${dateStr}T${timeStr}:00`);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

export default function AgendaScreen() {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

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

  // --- SELEÇÃO MÚLTIPLA ---
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states Agenda
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState("RACHA");
  const [lembrete, setLembrete] = useState(null);

  // Estados Financeiros
  const [gerarFinanceiro, setGerarFinanceiro] = useState(false);
  const [valorFinanceiro, setValorFinanceiro] = useState("");
  const [tipoFinanceiro, setTipoFinanceiro] = useState("RECEITA"); 
  const [loading, setLoading] = useState(false);

  /* ======================
      BUSCAR RESUMO
  ====================== */
  async function carregarResumoMes(dataRef) {
    try {
      const res = await api.get(`/eventos/resumo-mes`, { params: { data: dataRef } });
      const listaDatas = res.data || [];
      const marcacoes = {};
      listaDatas.forEach((dia) => {
        marcacoes[dia] = { marked: true, dotColor: "#E67E22" };
      });
      setDiasComEventos(marcacoes);
    } catch (err) {
      console.log("Erro ao carregar resumo do mês:", err);
    }
  }

  /* ======================
      BUSCAR EVENTOS
  ====================== */
  async function carregarEventos() {
    try {
      const res = await api.get(`/eventos/dia/${dataSelecionada}`);
      setEventos(res.data || []);
      setSelectedIds([]); 
    } catch (err) {
      console.log("Erro ao buscar eventos do dia");
    }
  }

  useEffect(() => { carregarEventos(); }, [dataSelecionada]);
  
  // Atualiza o resumo sempre que o mês da data selecionada mudar
  useEffect(() => { 
      carregarResumoMes(dataSelecionada); 
  }, [dataSelecionada]); 

  /* ======================
      AÇÕES
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
        toggleSelection(evento.id);
    } else {
        abrirEdicao(evento);
    }
  }

  function handleLongPress(evento) {
    toggleSelection(evento.id);
  }

  async function excluirSelecionados() {
    const msg = `Deseja excluir ${selectedIds.length} eventos?\n\nATENÇÃO: Os lançamentos financeiros vinculados também serão apagados.`;
    const confirmarExclusao = async () => {
        try {
            setLoading(true);
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
    setGerarFinanceiro(false);
    setValorFinanceiro("");
    setTipoFinanceiro("RECEITA");
    setModalVisivel(true);
  }

  function abrirEdicao(evento) {
    setEventoEditando(evento);
    setTitulo(evento.titulo);
    setInicio(format(fixDateFromDB(evento.inicio), "HH:mm"));
    setFim(format(fixDateFromDB(evento.fim), "HH:mm"));
    setTipo(evento.tipo);
    setLembrete(evento.lembreteMinutosAntes1 ?? null);
    setGerarFinanceiro(false);
    setModalVisivel(true);
  }

 async function salvarEvento() {
    if (!titulo.trim()) return exibirAlerta("Campo Obrigatório", "Por favor, digite um título.");
    if (!inicio.trim() || !fim.trim()) return exibirAlerta("Campo Obrigatório", "Preencha os horários.");
    if (!horaValida(inicio) || !horaValida(fim)) return exibirAlerta("Erro", "Horários inválidos.");

    // 1. Data REAL (Horário que você vê no celular)
    const dataTentativa = new Date(`${dataSelecionada}T${inicio}:00`);
    const agora = new Date();

    // Validação: Não permite criar no passado
    if (dataTentativa < agora) {
        return exibirAlerta("Data Inválida", "Não é possível agendar eventos no passado.");
    }

    // 2. Data PARA O BANCO (Com fuso corrigido para UTC)
    const inicioDate = prepareDateForDB(dataSelecionada, inicio);
    const fimDate = prepareDateForDB(dataSelecionada, fim);

    if (fimDate <= inicioDate) return exibirAlerta("Erro", "O horário de término deve ser maior que o início.");

    let valorFloat = 0;
    if (gerarFinanceiro && !eventoEditando) {
        if (!valorFinanceiro.trim()) return exibirAlerta("Erro", "Informe o valor.");
        valorFloat = parseFloat(valorFinanceiro.replace(",", "."));
        if (isNaN(valorFloat) || valorFloat <= 0) return exibirAlerta("Erro", "Valor inválido.");
    }

    try {
      setLoading(true);
      const payload = {
        titulo, tipo,
        inicio: inicioDate.toISOString(), // Manda a data preparada pro Banco
        fim: fimDate.toISOString(),
        lembreteMinutosAntes1: lembrete,
        gerarFinanceiro: (!eventoEditando && gerarFinanceiro),
        valor: valorFloat,
        tipoFinanceiro
      };

      if (eventoEditando) {
        await api.put(`/eventos/${eventoEditando.id}`, payload);
      } else {
        await api.post("/eventos", payload);
      }

      // --- CORREÇÃO DA NOTIFICAÇÃO ---
      if (lembrete) {
          // Usamos 'dataTentativa' (Horário Real Local) para a notificação
          const dataAviso = new Date(dataTentativa.getTime() - (lembrete * 60000));

          await agendarLembreteData(`Seu evento "${titulo}" começa em breve!`, dataAviso);
      }
      // -------------------------------

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
      PICKER DATA
  ====================== */
  function abrirPickerData(date) {
    const d = new Date(date);
    d.setHours(12); 
    setPickerAno(d.getFullYear());
    setModalDataVisivel(true);
  }

  function selecionarMesAno(mesIndex) {
    const novaData = new Date(pickerAno, mesIndex, 1, 12, 0, 0);
    const novaDataISO = format(novaData, "yyyy-MM-dd");
    setDataSelecionada(novaDataISO);
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
        eventos: eventos.filter((e) => {
            const dataEvento = fixDateFromDB(e.inicio);
            return format(dataEvento, "yyyy-MM-dd") === dataISO;
        }),
      };
    });
  }, [eventos, dataSelecionada]);

  /* ======================
      RENDER
  ====================== */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      
      {/* HEADER */}
      {selectedIds.length > 0 ? (
          <View style={[styles.headerSelection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedIds([])}>
                  <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.textSelection, { color: colors.text }]}>{selectedIds.length} selecionado(s)</Text>
              <TouchableOpacity onPress={excluirSelecionados}>
                  <Ionicons name="trash" size={24} color={colors.danger} />
              </TouchableOpacity>
          </View>
      ) : (
          <Calendar
            key={`${isDark ? 'dark' : 'light'}-${dataSelecionada.substring(0, 7)}`}
            current={dataSelecionada}
            onMonthChange={(month) => {
               carregarResumoMes(month.dateString);
            }}
            onDayPress={(day) => setDataSelecionada(day.dateString)}
            markedDates={{
              ...diasComEventos, 
              [dataSelecionada]: {
                selected: true,
                selectedColor: colors.primary,
                ...(diasComEventos[dataSelecionada] || {}),
              },
            }}
            theme={{
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textSecondary,
                dotColor: '#E67E22',
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                monthTextColor: colors.primary,
                indicatorColor: colors.primary,
                textMonthFontWeight: 'bold',
                textMonthFontSize: 16,
            }}
            renderHeader={(date) => {
                const d = new Date(date);
                d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                const tituloMes = format(d, "MMMM yyyy", { locale: ptBR }).toUpperCase();
                return (
                    <TouchableOpacity onPress={() => abrirPickerData(date)}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold', color: colors.primary}}>{tituloMes}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                );
            }}
          />
      )}

      {selectedIds.length === 0 && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, { backgroundColor: colors.surface, borderColor: colors.border }, visualizacao === "DIA" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setVisualizacao("DIA")}
            >
              <Text style={visualizacao === "DIA" ? styles.textoTabAtiva : [styles.textoTab, { color: colors.text }]}>Dia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, { backgroundColor: colors.surface, borderColor: colors.border }, visualizacao === "SEMANA" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setVisualizacao("SEMANA")}
            >
              <Text style={visualizacao === "SEMANA" ? styles.textoTabAtiva : [styles.textoTab, { color: colors.text }]}>Semana</Text>
            </TouchableOpacity>
          </View>
      )}

      {selectedIds.length === 0 && (
          <TouchableOpacity style={[styles.add, { backgroundColor: colors.primary }]} onPress={abrirCriacao}>
            <Text style={{ color: "#fff", fontWeight: 'bold' }}>+ Novo Evento</Text>
          </TouchableOpacity>
      )}

      <FlatList
        data={visualizacao === "DIA" ? eventos : semana}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        ListEmptyComponent={
            visualizacao === "DIA" && (
                <Text style={[styles.vazio, { color: colors.textSecondary }]}>Nenhum evento neste dia.</Text>
            )
        }
        renderItem={({ item }) =>
          visualizacao === "DIA" ? (
            <EventoCard
              key={item.id}
              evento={item}
              selecionado={selectedIds.includes(item.id)}
              onPress={() => handleCardPress(item)}
              onLongPress={() => handleLongPress(item)}
              onDelete={excluirEvento}
            />
          ) : (
            <View>
              <Text style={[styles.diaHeader, { color: colors.text }]}>{item.label}</Text>
              {item.eventos.length === 0 && <Text style={[styles.semEventos, { color: colors.textSecondary }]}>Sem eventos</Text>}
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
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrapper}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalTitle, { color: colors.text }]}>{eventoEditando ? "Editar Evento" : "Novo Evento"}</Text>

                <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Título</Text>
                <TextInput
                  placeholder="ex: Racha do Neto"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  value={titulo}
                  onChangeText={setTitulo}
                />

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}>
                        <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Início</Text>
                        <TextInput
                        placeholder="00:00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        value={inicio}
                        onChangeText={(v) => setInicio(formatarHora(v))}
                        />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Fim</Text>
                        <TextInput
                        placeholder="00:00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        value={fim}
                        onChangeText={(v) => setFim(formatarHora(v))}
                        />
                    </View>
                </View>

                {!eventoEditando && (
                    <View style={[styles.boxFinanceiro, { backgroundColor: isDark ? '#1E2A38' : '#F0F8FF', borderColor: isDark ? '#2C3E50' : '#D1E8FF' }]}>
                        <View style={styles.headerFinanceiro}>
                            <Text style={[styles.labelFinanceiro, { color: isDark ? '#90CAF9' : '#0056b3' }]}>Lançar no Financeiro?</Text>
                            <Switch value={gerarFinanceiro} onValueChange={setGerarFinanceiro} trackColor={{ false: "#767577", true: "#2ECC71" }} thumbColor={gerarFinanceiro ? "#fff" : "#f4f3f4"} />
                        </View>
                        {gerarFinanceiro && (
                            <View>
                                <Text style={[styles.labelInput, { color: colors.textSecondary }]}>Valor do Evento (R$)</Text>
                                <TextInput 
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                    placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={valorFinanceiro} onChangeText={setValorFinanceiro} 
                                />
                                <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                                    <TouchableOpacity style={[styles.btnTipo, { backgroundColor: colors.surface, borderColor: colors.border }, tipoFinanceiro === 'RECEITA' && {backgroundColor: '#2ECC71', borderColor: '#2ECC71'}]} onPress={() => setTipoFinanceiro('RECEITA')}>
                                        <Text style={{color: tipoFinanceiro === 'RECEITA' ? '#fff' : colors.text, fontWeight: 'bold'}}>Entrada</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btnTipo, { backgroundColor: colors.surface, borderColor: colors.border }, tipoFinanceiro === 'DESPESA' && {backgroundColor: '#E74C3C', borderColor: '#E74C3C'}]} onPress={() => setTipoFinanceiro('DESPESA')}>
                                        <Text style={{color: tipoFinanceiro === 'DESPESA' ? '#fff' : colors.text, fontWeight: 'bold'}}>Saída</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
                <View style={styles.tipos}>
                  {TIPOS.map((t) => (
                    <TouchableOpacity key={t.key} onPress={() => setTipo(t.key)} style={[styles.tipo, { backgroundColor: tipo === t.key ? t.cor : (isDark ? '#333' : '#eee') }]}>
                      <Text style={{ color: tipo === t.key ? "#fff" : colors.text, fontSize: 12 }}>{t.key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Lembrete</Text>
                <View style={styles.lembretes}>
                  {LEMBRETES.map((l) => (
                    <TouchableOpacity key={l.value} onPress={() => setLembrete(l.value)} style={[styles.lembrete, { backgroundColor: lembrete === l.value ? colors.primary : (isDark ? '#333' : '#eee') }]}>
                      <Text style={{ color: lembrete === l.value ? "#fff" : colors.text, fontSize: 11 }}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.criar, { backgroundColor: colors.primary }, loading && {opacity: 0.7}]} onPress={loading ? null : salvarEvento} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: 'bold' }}>{eventoEditando ? "Salvar Alterações" : "Criar Evento"}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setModalVisivel(false)} disabled={loading}>
                  <Text style={[styles.cancelar, { color: colors.danger }]}>Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- MODAL PICKER --- */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
        <View style={styles.overlay}>
            <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
                <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setPickerAno(pickerAno - 1)}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
                    <Text style={[styles.pickerAnoTexto, { color: colors.text }]}>{pickerAno}</Text>
                    <TouchableOpacity onPress={() => setPickerAno(pickerAno + 1)}><Ionicons name="chevron-forward" size={24} color={colors.text}/></TouchableOpacity>
                </View>
                <View style={styles.mesesGrid}>
                    {LocaleConfig.locales['pt-br'].monthNamesShort.map((mes, index) => (
                        <TouchableOpacity key={index} style={[styles.mesBotao, { backgroundColor: isDark ? '#333' : '#f2f2f2' }]} onPress={() => selecionarMesAno(index)}>
                            <Text style={[styles.mesTexto, { color: colors.text }]}>{mes.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={() => setModalDataVisivel(false)} style={styles.pickerFechar}>
                    <Text style={{color: colors.danger, fontWeight: 'bold'}}>Fechar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Card corrigido com suporte a tema e fuso horário
function EventoCard({ evento, onPress, onLongPress, onDelete, selecionado }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const cor = TIPOS.find((t) => t.key === evento.tipo)?.cor || "#ccc";
  
  const dataInicio = fixDateFromDB(evento.inicio);
  const dataFim = fixDateFromDB(evento.fim);
  const jaPassou = dataFim < new Date();

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: colors.surface },
        jaPassou && { backgroundColor: isDark ? '#1f1f1f' : '#f0f0f0', borderColor: colors.border, borderWidth: 1, opacity: 0.7 },
        selecionado && { backgroundColor: isDark ? '#1A3B5C' : '#E3F2FD', borderColor: colors.primary, borderWidth: 1 }
      ]} 
      onPress={jaPassou ? null : onPress} 
      onLongPress={jaPassou ? null : onLongPress} 
      disabled={jaPassou} 
    >
      <View style={[styles.lateral, { backgroundColor: jaPassou ? "#999" : cor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.titulo, { color: colors.text }, jaPassou && styles.textoPassado]}>{evento.titulo} {jaPassou && "(Encerrado)"}</Text>
        <Text style={[styles.horario, { color: colors.textSecondary }, jaPassou && styles.textoPassado]}>{format(dataInicio, "HH:mm")} - {format(dataFim, "HH:mm")}</Text>
      </View>
      {selecionado ? (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      ) : (
          onDelete && !jaPassou && (
            <TouchableOpacity onPress={() => onDelete(evento.id)} style={{padding: 5}}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          )
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerSelection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  textSelection: { fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderRadius: 20 },
  textoTab: { },
  textoTabAtiva: { color: '#fff', fontWeight: 'bold' },
  add: { margin: 16, padding: 14, borderRadius: 10, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  vazio: { textAlign: 'center', marginTop: 20 },
  diaHeader: { fontWeight: "bold", fontSize: 16, marginTop: 16, marginBottom: 8 },
  semEventos: { fontStyle: 'italic', fontSize: 12, marginBottom: 8 },
  card: { flexDirection: "row", padding: 14, borderRadius: 10, marginBottom: 10, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  textoPassado: { textDecorationLine: 'none' },
  lateral: { width: 4, height: '100%', marginRight: 12, borderRadius: 4, position: 'absolute', left: 0, top: 0, bottom: 0, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  titulo: { fontWeight: "bold", fontSize: 15 },
  horario: { fontSize: 12, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalWrapper: { flex: 1, justifyContent: "center" },
  modal: { borderRadius: 16, padding: 20, maxHeight: "90%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  labelInput: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  label: { fontWeight: "bold", marginBottom: 8, marginTop: 8 },
  tipos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipo: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  lembretes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lembrete: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  criar: { padding: 16, borderRadius: 10, alignItems: "center", marginTop: 24 },
  cancelar: { textAlign: "center", marginTop: 16, fontWeight: '600' },
  pickerModal: { borderRadius: 16, padding: 20, alignItems: 'center', width: '90%', alignSelf:'center' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  pickerAnoTexto: { fontSize: 22, fontWeight: 'bold' },
  mesesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  mesBotao: { width: '30%', paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  mesTexto: { fontWeight: 'bold' },
  pickerFechar: { marginTop: 20, padding: 10 },
  boxFinanceiro: { padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1 },
  headerFinanceiro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelFinanceiro: { fontWeight: 'bold' },
  btnTipo: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' }
});