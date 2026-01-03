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
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { format, addDays, isBefore, isSameDay } from "date-fns";
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

export default function AgendaScreen() {
  const hoje = new Date();
  const hojeISO = format(hoje, "yyyy-MM-dd");

  const [dataSelecionada, setDataSelecionada] = useState(hojeISO);
  const [visualizacao, setVisualizacao] = useState("DIA");
  const [eventos, setEventos] = useState([]);
  
  const [diasComEventos, setDiasComEventos] = useState({});

  const [modalVisivel, setModalVisivel] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  // Form states
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState("RACHA");
  const [lembrete, setLembrete] = useState(null);

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
     MODAL & CRUD
  ====================== */
  function abrirCriacao() {
    setEventoEditando(null);
    setTitulo("");
    setInicio("");
    setFim("");
    setTipo("RACHA");
    setLembrete(null);
    setModalVisivel(true);
  }

  function abrirEdicao(evento) {
    setEventoEditando(evento);
    setTitulo(evento.titulo);
    setInicio(format(new Date(evento.inicio), "HH:mm"));
    setFim(format(new Date(evento.fim), "HH:mm"));
    setTipo(evento.tipo);
    setLembrete(evento.lembreteMinutosAntes1 ?? null);
    setModalVisivel(true);
  }

  async function salvarEvento() {
    // --- 🔒 VALIDAÇÃO OBRIGATÓRIA (CORREÇÃO) ---
    if (!titulo.trim()) {
      return Alert.alert("Campo Obrigatório", "Por favor, digite um título para o evento.");
    }
    if (!inicio.trim() || !fim.trim()) {
      return Alert.alert("Campo Obrigatório", "Por favor, preencha os horários de início e fim.");
    }
    if (!horaValida(inicio) || !horaValida(fim)) {
      return Alert.alert("Erro", "Horários inválidos. Use o formato HH:mm (ex: 14:30).");
    }

    const inicioDate = new Date(`${dataSelecionada}T${inicio}:00`);
    const fimDate = new Date(`${dataSelecionada}T${fim}:00`);

    if (fimDate <= inicioDate) {
      return Alert.alert("Erro", "O horário de término deve ser maior que o início.");
    }

    try {
      const payload = {
        titulo,
        tipo,
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString(),
        lembreteMinutosAntes1: lembrete,
      };

      if (eventoEditando) {
        await api.put(`/eventos/${eventoEditando.id}`, payload);
      } else {
        await api.post("/eventos", payload);
      }

      setModalVisivel(false);
      carregarEventos(); 
      carregarResumoMes(dataSelecionada); 
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao salvar evento";
      Alert.alert("Erro", msg);
    }
  }

  async function excluirEvento(id) {
    Alert.alert("Excluir", "Deseja excluir este evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/eventos/${id}`);
            carregarEventos(); 
            carregarResumoMes(dataSelecionada); 
          } catch (err) {
            Alert.alert("Erro", "Não foi possível excluir.");
          }
        },
      },
    ]);
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
      
      <Calendar
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
        }}
      />

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

      <TouchableOpacity style={styles.add} onPress={abrirCriacao}>
        <Text style={{ color: "#fff", fontWeight: 'bold' }}>+ Novo Evento</Text>
      </TouchableOpacity>

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
              onPress={() => abrirEdicao(item)}
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
                  onPress={() => abrirEdicao(e)}
                  onDelete={excluirEvento}
                />
              ))}
            </View>
          )
        }
      />

      {/* --- MODAL DE CRIAÇÃO (CORRIGIDO: Removido TouchableWithoutFeedback problemático) --- */}
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
                        placeholder="Horário de Início"
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
                        placeholder="Horário de Término"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        style={styles.input}
                        value={fim}
                        onChangeText={(v) => setFim(formatarHora(v))}
                        />
                    </View>
                </View>

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

                <TouchableOpacity style={styles.criar} onPress={salvarEvento}>
                  <Text style={{ color: "#fff", fontWeight: 'bold' }}>
                    {eventoEditando ? "Salvar Alterações" : "Criar Evento"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setModalVisivel(false)}>
                  <Text style={styles.cancelar}>Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ======================
   CARD EVENTO
====================== */
function EventoCard({ evento, onPress, onDelete }) {
  const cor = TIPOS.find((t) => t.key === evento.tipo)?.cor || "#ccc";
  
  const agora = new Date();
  const fimEvento = new Date(evento.fim);
  const jaPassou = fimEvento < agora;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        jaPassou && styles.cardPassado 
      ]} 
      onPress={jaPassou ? null : onPress} 
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

      {onDelete && !jaPassou && (
        <TouchableOpacity onPress={() => onDelete(evento.id)} style={{padding: 5}}>
          <Ionicons name="trash-outline" size={20} color="#E74C3C" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ======================
   ESTILOS
====================== */
const styles = StyleSheet.create({
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
    maxHeight: "85%",
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
    color: "#333", // Cor do texto forçada
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
});