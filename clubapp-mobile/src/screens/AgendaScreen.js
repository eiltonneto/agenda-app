import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, 
  ScrollView, Switch, StatusBar, Platform, KeyboardAvoidingView, 
  useWindowDimensions, Animated, Easing
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO, setYear, setMonth, isValid, addHours
} from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
// 🚀 V3: Importamos o estado global que já vem hidratado do Bootstrap
import { useAuth } from "../context/AuthContext";

const PRESET_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b", "#1e293b"];
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Geral', color: '#64748b' },
  { id: '2', name: 'Trabalho', color: '#3b82f6' },
  { id: '3', name: 'Lazer', color: '#10b981' }
];

export default function AgendaScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 900;
  
  // Consumindo o estado global (sem necessidade de fetch inicial)
const { eventosGlobais, setEventosGlobais, receitasGlobais, setReceitasGlobais } = useAuth();

  //ESTADOS 
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  
  // MODAIS
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalPickerVisivel, setModalPickerVisivel] = useState(false);
  const [modalCatVisivel, setModalCatVisivel] = useState(false); 
  
  // Formulário Evento
  const [pickerAno, setPickerAno] = useState(new Date().getFullYear());
  const [eventoEditando, setEventoEditando] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [horaInicio, setHoraInicio] = useState(""); 
  const [horaFim, setHoraFim] = useState(""); 
  const [observacao, setObservacao] = useState("");
  const [gerarFinanceiro, setGerarFinanceiro] = useState(false);
  const [valorFinanceiro, setValorFinanceiro] = useState("");
  const [lembreteValor, setLembreteValor] = useState("");
  const [lembreteUnidade, setLembreteUnidade] = useState("MINUTOS"); 
  
  // Categorias
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [catEditing, setCatEditing] = useState({ id: '', name: '', color: '', isNew: true }); 

  // --- ⚠️ COMPENSAÇÃO DE FUSO HORÁRIO ---
  const getLocalDate = (isoString) => {
    if (!isoString) return new Date();
    const date = parseISO(isoString);
    return isoString.includes('Z') ? addHours(date, 3) : date;
  };

  // --- EFEITOS ---
  useEffect(() => {
    async function loadCategories() {
        try {
            const saved = await AsyncStorage.getItem("@YourFlow:categories");
            if (saved) {
                const parsed = JSON.parse(saved);
                setCategories(parsed);
                if (parsed.length > 0) setSelectedCategory(parsed[0]);
            }
        } catch (e) { console.log("Erro carregar categorias", e); }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.exp) }).start();
  }, [currentMonth]);

  const tratarErro = (error) => {
    let mensagem = error.response?.data?.error || "Ocorreu um erro inesperado.";
    if (error.message?.includes("Network Error")) mensagem = "Sem conexão com o servidor.";
    setErrorMessage(mensagem);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  // 🚀 V3: Busca silenciosa (Background Fetch) apenas ao mudar o mês manualmente
  const mudarMesSilenciosamente = (novaData) => {
    setCurrentMonth(novaData);
    // Dispara a requisição em background sem mostrar loading
    api.get('/eventos').then(res => {
      if (Array.isArray(res.data)) setEventosGlobais(res.data);
    }).catch(e => console.log("Erro no background fetch:", e.message));
  };

  // --- LÓGICA DE EVENTOS (OPTIMISTIC UI) ---
  const handleLongPressEvento = (id) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter(itemId => itemId !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  const handlePressEvento = (ev) => {
    if (selectedEventIds.length > 0) {
      handleLongPressEvento(ev.id);
    } else {
      abrirModalEdicao(ev);
    }
  };

  const excluirSelecionados = () => {
    const executeDelete = async () => {
      const idsToDelete = [...selectedEventIds];
      const backups = eventosGlobais.filter(e => idsToDelete.includes(e.id));
      
      // OTIMISTA: Limpa a tela instantaneamente
      setSelectedEventIds([]);
      setEventosGlobais(prev => prev.filter(e => !idsToDelete.includes(e.id)));

      try {
        await api.post("/eventos/excluir-massa", { ids: idsToDelete });
      } catch (e) { 
        setEventosGlobais(prev => [...prev, ...backups]); // Rollback
        tratarErro(e); 
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja apagar ${selectedEventIds.length} eventos selecionados?`)) executeDelete();
    } else {
      Alert.alert("Excluir Vários", `Deseja apagar ${selectedEventIds.length} eventos selecionados?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Excluir", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  const handleExcluirEvento = (id) => {
    const executeDelete = async () => {
      const backup = eventosGlobais.find(e => e.id === id);
      
      // OTIMISTA: Remove da tela antes do backend responder
      setModalVisivel(false); 
      setEventosGlobais(prev => prev.filter(e => e.id !== id));

      try {
        await api.delete(`/eventos/${id}`);
      } catch (error) { 
        setEventosGlobais(prev => [...prev, backup]); // Rollback
        tratarErro(error); 
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm("Deseja apagar este evento?")) executeDelete();
    } else {
      Alert.alert("Excluir", "Apagar este evento?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  const handleTimeMask = (text, setter) => {
    let val = text.replace(/\D/g, "");
    if (val.length >= 3) val = val.slice(0, 2) + ":" + val.slice(2, 4);
    setter(val.slice(0, 5));
  };

  const handleMoneyMask = (text) => {
    let value = text.replace(/\D/g, "");
    value = (Number(value) / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setValorFinanceiro(value);
  };

  const abrirModalCriacao = () => {
    setErrorMessage("");
    setEventoEditando(null); 
    setTitulo(""); 
    setHoraInicio(""); 
    setHoraFim(""); 
    setObservacao("");
    setGerarFinanceiro(false);
    setValorFinanceiro("");
    setLembreteValor("");
    setLembreteUnidade("MINUTOS");
    setModalVisivel(true); 
  };

  const abrirModalEdicao = (ev) => {
    setErrorMessage("");
    setEventoEditando(ev); 
    setTitulo(ev.titulo);
    try {
        const dataInicio = getLocalDate(ev.inicio);
        const dataFim = getLocalDate(ev.fim);
        setHoraInicio(format(dataInicio, "HH:mm"));
        setHoraFim(format(dataFim, "HH:mm"));
    } catch {
        setHoraInicio("");
        setHoraFim("");
    }
    setObservacao(ev.descricao || "");
    setGerarFinanceiro(ev.gerarFinanceiro || false);
    setValorFinanceiro(ev.valor ? ev.valor.toFixed(2).replace('.', ',') : "");
    setLembreteValor(ev.lembreteValor ? String(ev.lembreteValor) : "");
    setLembreteUnidade(ev.lembreteUnidade || "MINUTOS");
    
    const cat = categories.find(c => c.name === ev.tipo || c.id === ev.categoria_id);
    if(cat) setSelectedCategory(cat);
    
    setModalVisivel(true); 
  };

const salvarEvento = async () => {
    setErrorMessage(""); 
    
    // 👇 Validações e criação do valorFinal (Isto estava faltando!)
    if (!titulo.trim()) return setErrorMessage("O nome do evento é obrigatório.");
    if (horaInicio.length !== 5 || horaFim.length !== 5) return setErrorMessage("Preencha o horário completo (HH:mm).");
    if (horaFim <= horaInicio) return setErrorMessage("A hora de término deve ser maior que a de início.");

    let valorFinal = 0.0;
    if (gerarFinanceiro) {
      if (!valorFinanceiro) return setErrorMessage("Informe o valor financeiro.");
      const valorLimpo = valorFinanceiro.replace(/\./g, '').replace(',', '.');
      valorFinal = parseFloat(valorLimpo);
      if (isNaN(valorFinal) || valorFinal <= 0) return setErrorMessage("Valor financeiro inválido.");
    }

    const dataIso = format(selectedDate, "yyyy-MM-dd");
    const inicioFormatado = `${dataIso}T${horaInicio}:00`;
    const fimFormatado = `${dataIso}T${horaFim}:00`;

    const payload = {
      titulo: titulo.trim(),
      inicio: inicioFormatado, 
      fim: fimFormatado,
      categoria_id: selectedCategory.id,
      tipo: selectedCategory.name, 
      cor_categoria: selectedCategory.color,
      descricao: observacao || "",
      gerarFinanceiro: Boolean(gerarFinanceiro),
      valor: valorFinal, // Agora o payload encontra a variável declarada lá em cima!
      tipoFinanceiro: "RECEITA",
      lembreteValor: lembreteValor ? parseInt(lembreteValor) : null,
      lembreteUnidade: lembreteUnidade,
      status: "PENDENTE",
      comparecido: eventoEditando ? eventoEditando.comparecido : false
    };

    setModalVisivel(false);

    // 1. CRIAÇÃO OTIMISTA (AGENDA)
    const tempId = eventoEditando ? eventoEditando.id : `temp-${Date.now()}`;
    const eventoOtimista = { id: tempId, ...payload, temp: !eventoEditando };

    if (eventoEditando) {
      setEventosGlobais(prev => prev.map(e => e.id === tempId ? { ...e, ...payload } : e));
    } else {
      setEventosGlobais(prev => [...prev, eventoOtimista]);

      // 2. CRIAÇÃO OTIMISTA (FINANCEIRO): A mágica acontece aqui!
      if (gerarFinanceiro) {
         const receitaOtimista = {
            id: `rec-${tempId}`, // ID temporário
            descricao: `${selectedCategory.name}: ${payload.titulo}`,
            valor: payload.valor,
            status: "PENDENTE",
            eventDate: dataIso,
            paidAt: null,
            tipo: selectedCategory.name,
            tipo_financeiro: "RECEITA",
            temp: true // Ficará levemente transparente provando que é otimista
         };
         // Empurra a receita pra tela do Financeiro na mesma hora!
         setReceitasGlobais(prev => [...prev, receitaOtimista]);
      }
    }

    // 3. REQUISIÇÃO EM BACKGROUND (Sem travar o usuário)
    try {
      if (eventoEditando) {
        await api.put(`/eventos/${tempId}`, payload);
      } else {
        await api.post("/eventos", payload);
      }

      // 4. ATUALIZAÇÃO SILENCIOSA DO FINANCEIRO (Substitui o ID temporário pelo ID real do Banco)
      if (gerarFinanceiro) {
        const mes = selectedDate.getMonth() + 1;
        const ano = selectedDate.getFullYear();
        const req = await api.get("/receitas", { params: { mes, ano } });
        
        setReceitasGlobais(prev => {
          // 🚀 Agora filtramos pelo eventDate para manter a coerência
          const outras = prev.filter(p => p.eventDate && !p.eventDate.startsWith(`${ano}-${String(mes).padStart(2, '0')}`));
          return [...outras, ...req.data];
        });
      }
    } catch (e) {
      tratarErro(e);
      // Aqui entraria a lógica de rollback caso a internet caia
    }
  };

const toggleComparecido = async (evento) => {
    // Bloqueia o clique se o evento ainda for temporário (salvando no Render)
    if (evento.temp) return;

    const novoStatus = !evento.comparecido;
   
    // Backups para caso a internet caia
    const backupEventos = [...eventosGlobais];
    const backupReceitas = [...receitasGlobais];

    // 1. OTIMISMO NA AGENDA: Muda o ícone na mesma hora
    setEventosGlobais(prev => prev.map(e => e.id === evento.id ? { ...e, comparecido: novoStatus } : e));

    // 2. OTIMISMO NO FINANCEIRO: A mágica da integração!
    
    const agora = new Date().toISOString();
    const dataIso = evento.inicio.split('T')[0]; 

    setReceitasGlobais(prev => prev.map(r => {

  // 🚀 Busca pelo eventDate e pela descrição para dar a baixa otimista
  if (r.eventDate === dataIso && r.descricao.includes(evento.titulo)) {
    return { 
      ...r, 
      status: novoStatus ? "RECEBIDA" : "PENDENTE",
      paidAt: novoStatus ? agora : null // Carimba o faturamento real!
    };
  }
  return r;
}));
    // Procura a receita correspondente e dá a baixa automática
    setReceitasGlobais(prev => prev.map(r => {
      // 🚀 Busca pelo eventDate e pela descrição para dar a baixa otimista
      if (r.eventDate === dataIso && r.descricao.includes(evento.titulo)) {
        return { 
          ...r, 
          status: novoStatus ? "RECEBIDA" : "PENDENTE",
          paidAt: novoStatus ? agora : null // Carimba o faturamento real!
        };
      }
      return r;
    }));

    try {
      // 3. REQUISIÇÃO SIMPLES E DIRETA (Apenas avisa o banco da mudança do status)
      await api.put(`/eventos/${evento.id}`, { comparecido: novoStatus });
      
      // 4. ATUALIZAÇÃO SILENCIOSA DO FINANCEIRO (Usando o 'new Date' que corrigimos)
      const dataEventoObj = new Date(evento.inicio); 
      const mes = dataEventoObj.getMonth() + 1;
      const ano = dataEventoObj.getFullYear();
      
      api.get("/receitas", { params: { mes, ano } })
         .then(req => {
            setReceitasGlobais(prev => {
               // Mescla inteligente
               const outras = prev.filter(p => p.dataPrevista && !p.dataPrevista.startsWith(`${ano}-${String(mes).padStart(2, '0')}`));
               return [...outras, ...req.data];
            });
         }).catch(e => console.log("Erro na sincronização silenciosa", e));

    } catch (e) { 
      // ROLLBACK: Se a API falhar, desfaz a animação na Agenda e no Financeiro
      setEventosGlobais(backupEventos);
      setReceitasGlobais(backupReceitas);
      tratarErro(e);
    }
  };

  // --- GESTÃO DE CATEGORIAS ---
  const handleNovaCategoria = () => {
    setErrorMessage("");
    setCatEditing({ id: Date.now().toString(), name: "", color: PRESET_COLORS[0], isNew: true });
    setModalCatVisivel(true);
  };

  const handleEditarCategoria = (cat) => {
    setErrorMessage("");
    setCatEditing({ ...cat, isNew: false });
    setModalCatVisivel(true);
  };

  const salvarCategoriaPersistente = async () => {
    if (!catEditing.name?.trim()) return setErrorMessage("O nome da categoria é obrigatório.");
    let novaLista;
    if (catEditing.isNew) {
      novaLista = [...categories, { id: catEditing.id, name: catEditing.name, color: catEditing.color }];
    } else {
      novaLista = categories.map(c => c.id === catEditing.id ? catEditing : c);
    }
    setCategories(novaLista);
    await AsyncStorage.setItem("@YourFlow:categories", JSON.stringify(novaLista));
    if (catEditing.isNew || selectedCategory.id === catEditing.id) {
        setSelectedCategory(catEditing.isNew ? novaLista[novaLista.length - 1] : catEditing);
    }
    setModalCatVisivel(false);
  };

  const excluirCategoriaPersistente = async () => {
    if (categories.length <= 1) return setErrorMessage("Mantenha ao menos uma categoria.");
    const novaLista = categories.filter(c => c.id !== catEditing.id);
    setCategories(novaLista);
    await AsyncStorage.setItem("@YourFlow:categories", JSON.stringify(novaLista));
    setSelectedCategory(novaLista[0]);
    setModalCatVisivel(false);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
    const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, selectedEventIds.length > 0 && {backgroundColor: colors.primary + '20'}]}>
        {selectedEventIds.length > 0 ? (
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1}}>
             <View style={{flexDirection:'row', alignItems:'center'}}>
                <TouchableOpacity onPress={() => setSelectedEventIds([])}>
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={{fontSize: 18, fontWeight:'bold', marginLeft: 15, color: colors.text}}>
                  {selectedEventIds.length} selecionados
                </Text>
             </View>
             <TouchableOpacity onPress={excluirSelecionados}>
                <Ionicons name="trash" size={26} color={colors.danger} />
             </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.monthTrigger} 
              activeOpacity={0.6}
              onPress={() => { setPickerAno(currentMonth.getFullYear()); setModalPickerVisivel(true); }}
            >
              <Text style={[styles.monthLabel, {color: colors.text}]}>{format(currentMonth, "MMMM", { locale: ptBR })}</Text>
              <Text style={[styles.yearLabel, {color: colors.textSecondary}]}>{format(currentMonth, "yyyy")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.primary} style={{marginLeft: 5}} />
            </TouchableOpacity>

            <View style={styles.headerControls}>
              <TouchableOpacity onPress={() => mudarMesSilenciosamente(subMonths(currentMonth, 1))}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.todayBtn, {backgroundColor: colors.surface}]} onPress={() => { mudarMesSilenciosamente(new Date()); setSelectedDate(new Date()); }}>
                <Text style={[styles.todayText, {color: colors.primary}]}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mudarMesSilenciosamente(addMonths(currentMonth, 1))}>
                <Ionicons name="chevron-forward" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {errorMessage !== "" && !modalVisivel && !modalCatVisivel && (
        <View style={[styles.errorContainer, { marginHorizontal: 20 }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.weekHeader}>
        {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((d, i) => (
           <Text key={i} style={styles.weekText}>{d}</Text> 
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            // 🚀 Lendo diretamente do estado global
            const dayEvents = eventosGlobais.filter(e => { 
                try { return isSameDay(getLocalDate(e.inicio), day); } 
                catch { return false; } 
            });
            const cellWidth = (windowWidth - (isDesktop ? 120 : 20)) / 7;

            return (
              <TouchableOpacity 
                key={day.toString()} 
                style={[
                  styles.dayCell, 
                  { width: cellWidth, height: 90 }, 
                  !isSameMonth(day, currentMonth) && styles.dayOutside, 
                  isSelected && { backgroundColor: colors.primary + '10', borderRadius: 8, borderColor: colors.primary, borderWidth: 1 }
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayNum, {color: colors.text}, isToday && {color: colors.primary, fontWeight: '900'}]}>{format(day, "d")}</Text>
                <View style={styles.eventContainer}>
                  {dayEvents.slice(0, 3).map((ev, index) => (
                    <View key={index} style={[styles.eventChip, { backgroundColor: ev.cor_categoria || colors.primary }, ev.temp && {opacity: 0.5}]}>
                      <Text style={styles.eventChipText} numberOfLines={1}>{ev.titulo}</Text>
                    </View>
                  ))}
                  {dayEvents.length > 3 && <Text style={{fontSize: 9, color: colors.textSecondary}}>+{dayEvents.length - 3}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <View style={[styles.detailsSection, isDesktop && { paddingHorizontal: 60 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.dateTitle}>{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase()}</Text>
            <TouchableOpacity style={[styles.btnAddMini, {backgroundColor: colors.primary}]} onPress={abrirModalCriacao}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {eventosGlobais.filter(e => { try { return isSameDay(getLocalDate(e.inicio), selectedDate); } catch { return false; } }).map(ev => {
             const isSelected = selectedEventIds.includes(ev.id);
             return (
              <View 
                key={ev.id} 
                style={[
                  styles.eventCard, 
                  { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { borderWidth: 2, backgroundColor: colors.primary + '15' },
                  ev.temp && { opacity: 0.6 } // Efeito visual para itens que ainda estão salvando no background
                ]}
              >
                <TouchableOpacity onPress={() => toggleComparecido(ev)} style={{padding: 10, paddingLeft: 0}}>
                   <Ionicons name={ev.comparecido ? "checkbox" : "square-outline"} size={28} color={ev.comparecido ? colors.success : colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{flex: 1}}
                  onPress={() => handlePressEvento(ev)}
                  onLongPress={() => handleLongPressEvento(ev.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cardTitle, {color: colors.text}, ev.comparecido && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                    {ev.titulo}
                  </Text>
                  
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap'}}>
                     <View style={[styles.dotCategory, {backgroundColor: ev.cor_categoria || colors.primary}]} />
                     <Text style={{fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginRight: 8, textTransform: 'uppercase'}}>
                        {ev.tipo || "GERAL"}
                     </Text>
                     <Text style={[styles.cardInfo, {color: colors.textSecondary}]}>
                        • {isValid(getLocalDate(ev.inicio)) ? format(getLocalDate(ev.inicio), "HH:mm") : "--:--"} às {isValid(getLocalDate(ev.fim)) ? format(getLocalDate(ev.fim), "HH:mm") : "--:--"}
                     </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExcluirEvento(ev.id)} style={{padding: 10}}>
                  <Ionicons name="trash-outline" size={24} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )
          })}
          
          {eventosGlobais.filter(e => { try { return isSameDay(getLocalDate(e.inicio), selectedDate); } catch { return false; } }).length === 0 && (
             <Text style={styles.emptyText}>Nenhum agendamento para este dia.</Text>
          )}
        </View>
      </ScrollView>

      {/* --- MODAL DE EVENTO --- */}
      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisivel(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface, width: isDesktop ? 600 : '100%' }]}>
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, {color: colors.text}]}>{eventoEditando ? "Editar Evento" : "Novo Agendamento"}</Text>
                <TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
              </View>

              {errorMessage !== "" && (
                <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>NOME DO EVENTO</Text>
                <TextInput style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} value={titulo} onChangeText={setTitulo} placeholder="Ex: Pagamento Racha..." placeholderTextColor={colors.textSecondary}/>

                <View style={styles.rowBetween}>
                  <Text style={styles.label}>LOCAL / CATEGORIA</Text>
                  <TouchableOpacity onPress={handleNovaCategoria}><Text style={[styles.linkAction, {color: colors.primary}]}>+ Novo Local</Text></TouchableOpacity>
                </View>

                <View style={styles.catGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      onPress={() => setSelectedCategory(cat)}
                      onLongPress={() => handleEditarCategoria(cat)} 
                      delayLongPress={400}
                      style={[styles.catChip, selectedCategory.id === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                    >
                      <Text style={[styles.catText, selectedCategory.id === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hintText}>* Segure para editar ou excluir.</Text>

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>INÍCIO</Text>
                    <TextInput style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} value={horaInicio} onChangeText={t => handleTimeMask(t, setHoraInicio)} placeholder="00:00" keyboardType="numeric" maxLength={5} placeholderTextColor={colors.textSecondary}/>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>FIM</Text>
                    <TextInput style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} value={horaFim} onChangeText={t => handleTimeMask(t, setHoraFim)} placeholder="00:00" keyboardType="numeric" maxLength={5} placeholderTextColor={colors.textSecondary}/>
                  </View>
                </View>

                <Text style={styles.label}>LEMBRETE (ANTES DO EVENTO)</Text>
                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                     <TextInput 
                        style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} 
                        value={lembreteValor} 
                        onChangeText={setLembreteValor} 
                        placeholder="0" 
                        keyboardType="numeric" 
                     />
                  </View>
                  <View style={{flex: 1.5, flexDirection: 'row', gap: 5}}>
                     {['MINUTOS', 'HORAS', 'DIAS'].map(opt => (
                        <TouchableOpacity 
                          key={opt}
                          style={[styles.unitBtn, lembreteUnidade === opt && {backgroundColor: colors.primary, borderColor: colors.primary}]}
                          onPress={() => setLembreteUnidade(opt)}
                        >
                           <Text style={[styles.unitText, lembreteUnidade === opt && {color: '#fff'}]}>{opt.slice(0,3)}</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
                </View>

                <View style={styles.financeBox}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.financeLabel}>Lançar no Financeiro?</Text>
                    <Switch value={gerarFinanceiro} onValueChange={setGerarFinanceiro} trackColor={{true: colors.success}} thumbColor="#fff" />
                  </View>
                  {gerarFinanceiro && (
                      <TextInput 
                        style={styles.inputMoney} 
                        placeholder="R$ 0,00" 
                        value={valorFinanceiro} 
                        onChangeText={handleMoneyMask} 
                        keyboardType="numeric" 
                      />
                  )}
                </View>

                <Text style={styles.label}>OBSERVAÇÕES</Text>
                <TextInput style={[styles.input, { height: 60, marginBottom: 20, color: colors.text, backgroundColor: colors.inputBackground }]} multiline value={observacao} onChangeText={setObservacao} placeholderTextColor={colors.textSecondary} />

                {/* 🚀 O botão agora salva instantaneamente e não fica preso em 'loading' */}
                <TouchableOpacity style={[styles.btnSave, {backgroundColor: colors.primary}]} onPress={salvarEvento}>
                  <Text style={styles.btnSaveText}>SALVAR EVENTO</Text>
                </TouchableOpacity>

              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* --- MODAL CATEGORIA --- */}
      <Modal visible={modalCatVisivel} transparent animationType="fade" onRequestClose={() => setModalCatVisivel(false)}>
        <View style={styles.overlayCenter}>
          <View style={[styles.modalCatContent, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalCatTitle, {color: colors.text}]}>{catEditing.isNew ? "Criar Local/Categoria" : "Editar Local/Categoria"}</Text>
            
            {errorMessage !== "" && (
                <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            )}

            <TextInput style={[styles.input, {backgroundColor: colors.inputBackground, color: colors.text}]} value={catEditing.name} onChangeText={t => setCatEditing({...catEditing, name: t})} placeholder="Nome" />
            <Text style={styles.label}>COR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(c => <TouchableOpacity key={c} onPress={() => setCatEditing({...catEditing, color: c})} style={[styles.colorCircle, { backgroundColor: c }, catEditing.color === c && styles.colorSelected]} />)}
            </View>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 15, width: '100%'}}>
                {!catEditing.isNew && <TouchableOpacity onPress={excluirCategoriaPersistente}><Text style={{color: colors.danger, fontWeight:'bold', padding: 10}}>Excluir</Text></TouchableOpacity>}
                <View style={{flexDirection:'row', gap: 10, flex: 1, justifyContent: 'flex-end'}}>
                   <TouchableOpacity onPress={() => { setModalCatVisivel(false); setErrorMessage(""); }}><Text style={{fontWeight:'bold', padding: 10, color: colors.textSecondary}}>Cancelar</Text></TouchableOpacity>
                   <TouchableOpacity onPress={salvarCategoriaPersistente} style={{backgroundColor: colors.primary, padding: 10, borderRadius: 8}}><Text style={{color:'#fff', fontWeight:'bold'}}>Salvar</Text></TouchableOpacity>
                </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL ANO --- */}
      <Modal visible={modalPickerVisivel} transparent animationType="fade" onRequestClose={() => setModalPickerVisivel(false)}>
         <TouchableOpacity style={styles.overlayCenter} activeOpacity={1} onPress={() => setModalPickerVisivel(false)}>
            <View style={[styles.pickerBox, {backgroundColor: colors.surface}]}>
               <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setPickerAno(pickerAno - 1)}><Ionicons name="chevron-back" size={24} color={colors.text}/></TouchableOpacity>
                  <Text style={[styles.pickerTitle, {color: colors.text}]}>{pickerAno}</Text>
                  <TouchableOpacity onPress={() => setPickerAno(pickerAno + 1)}><Ionicons name="chevron-forward" size={24} color={colors.text}/></TouchableOpacity>
               </View>
               <View style={styles.gridMonths}>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                    <TouchableOpacity key={m} style={styles.monthBtn} onPress={() => { mudarMesSilenciosamente(setMonth(setYear(new Date(), pickerAno), i)); setModalPickerVisivel(false); }}>
                      <Text style={[styles.monthBtnText, {color: colors.text}]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
         </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 20, paddingHorizontal: 20, minHeight: 70 },
  monthTrigger: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  monthLabel: { fontSize: 24, fontWeight: '900', textTransform: 'capitalize' },
  yearLabel: { fontSize: 24, fontWeight: '300', color: '#888', marginLeft: 5 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  todayBtn: { backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  todayText: { fontWeight: 'bold', color: '#3b82f6', fontSize: 12 },
  weekHeader: { flexDirection: 'row', marginBottom: 5 },
  weekText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#ccc' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  dayCell: { borderBottomWidth: 1, borderColor: '#f8f8f8', padding: 2, alignItems: 'center', justifyContent: 'flex-start' },
  dayOutside: { opacity: 0.3 },
  dayNum: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 2 },
  eventContainer: { width: '100%', alignItems: 'center', gap: 1, paddingHorizontal: 1 },
  eventChip: { width: '100%', paddingHorizontal: 3, paddingVertical: 2, borderRadius: 4, justifyContent: 'center' },
  eventChipText: { fontSize: 8, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  detailsSection: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  dateTitle: { fontSize: 13, fontWeight: '900', color: '#94a3b8' },
  btnAddMini: { backgroundColor: '#3b82f6', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  emptyText: { textAlign: 'center', color: '#ccc', fontStyle: 'italic', marginTop: 20 },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, elevation: 2, paddingLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  dotCategory: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  cardInfo: { fontSize: 12, marginTop: 0 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalKeyboard: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
  modalCatContent: { borderRadius: 25, padding: 25, width: 320 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalCatTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginTop: 15, marginBottom: 8 },
  input: { padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  linkAction: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  hintText: { fontSize: 10, color: '#ccc', fontStyle: 'italic', marginTop: 5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  catText: { fontWeight: '600', fontSize: 12, color: '#475569' },
  colorGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  colorCircle: { width: 24, height: 24, borderRadius: 12 },
  colorSelected: { borderWidth: 2, borderColor: '#000' },
  financeBox: { marginTop: 20, padding: 15, backgroundColor: '#f0fdf4', borderRadius: 20, borderWidth: 1, borderColor: '#dcfce7' },
  financeLabel: { fontWeight: 'bold', color: '#166534' },
  inputMoney: { backgroundColor: '#fff', marginTop: 10, padding: 12, borderRadius: 12, fontWeight: 'bold' },
  btnSave: { padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 30, marginBottom: 20 },
  btnSaveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  pickerBox: { borderRadius: 30, padding: 25, alignSelf: 'center', width: 320 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerTitle: { fontSize: 22, fontWeight: '900' },
  gridMonths: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  monthBtn: { width: '30%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  monthBtnText: { fontWeight: 'bold' },
  unitBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  unitText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});