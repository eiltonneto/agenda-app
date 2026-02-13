import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, 
  ScrollView, Switch, ActivityIndicator, StatusBar, Platform, 
  KeyboardAvoidingView, useWindowDimensions, Animated, Easing
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // IMPORTANTE PARA SALVAR CATEGORIAS
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO, setYear, setMonth, isValid
} from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../services/api";
import { useTheme } from "../context/ThemeContext";

const PRESET_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b", "#1e293b"];

// Categorias Padrão (caso não tenha nada salvo)
const DEFAULT_CATEGORIES = [
    { id: '1', name: 'Geral', color: '#64748b' },
    { id: '2', name: 'Trabalho', color: '#3b82f6' },
    { id: '3', name: 'Lazer', color: '#10b981' }
];

export default function AgendaScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 900;

  // --- ESTADOS ---
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Seleção Múltipla
  const [selectedEventIds, setSelectedEventIds] = useState([]);

  // Modais
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalPickerVisivel, setModalPickerVisivel] = useState(false);
  const [modalCatVisivel, setModalCatVisivel] = useState(false); 
  const [pickerAno, setPickerAno] = useState(new Date().getFullYear());

  // Formulário Evento
  const [eventoEditando, setEventoEditando] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [horaInicio, setHoraInicio] = useState(""); 
  const [horaFim, setHoraFim] = useState(""); 
  const [observacao, setObservacao] = useState("");
  
  // Financeiro e Lembretes
  const [gerarFinanceiro, setGerarFinanceiro] = useState(false);
  const [valorFinanceiro, setValorFinanceiro] = useState("");
  const [lembreteValor, setLembreteValor] = useState("");
  const [lembreteUnidade, setLembreteUnidade] = useState("MINUTOS"); // MINUTOS, HORAS, DIAS

  // Categorias (Gerenciadas via AsyncStorage)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [catEditing, setCatEditing] = useState({ id: '', name: '', color: '', isNew: true }); 

  // --- EFEITOS ---
  
  // 1. Carregar Categorias Salvas ao abrir
  useEffect(() => {
    async function loadCategories() {
        try {
            const saved = await AsyncStorage.getItem("@YourFlow:categories");
            if (saved) {
                const parsed = JSON.parse(saved);
                setCategories(parsed);
                // Garante que a selecionada existe
                if (parsed.length > 0) setSelectedCategory(parsed[0]);
            }
        } catch (e) { console.log("Erro carregar categorias", e); }
    }
    loadCategories();
  }, []);

  // 2. Animação Calendário
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.exp) }).start();
  }, [currentMonth]);

  // --- CARREGAR DADOS DA API ---
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/eventos');
      const dados = Array.isArray(res.data) ? res.data : [];
      setEventos(dados);
    } catch (err) { 
        console.log("Erro ao carregar agenda:", err.message); 
    } finally { 
        setLoading(false); 
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- LÓGICA DE SELEÇÃO MÚLTIPLA ---
  const handleLongPressEvento = (id) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter(itemId => itemId !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  const handlePressEvento = (ev) => {
    if (selectedEventIds.length > 0) {
      // Se já tem itens selecionados, o toque apenas seleciona/deseleciona
      handleLongPressEvento(ev.id);
    } else {
      // Se não tem seleção, abre a edição
      abrirModalEdicao(ev);
    }
  };

  const excluirSelecionados = () => {
    Alert.alert("Excluir Vários", `Deseja apagar ${selectedEventIds.length} eventos selecionados?`, [
      { text: "Cancelar" },
      { text: "Sim, Excluir", style: "destructive", onPress: async () => {
          try {
            // Executa todas as exclusões em paralelo
            await api.post("/eventos/excluir-massa", {
              ids: selectedEventIds
            });
            setSelectedEventIds([]); // Limpa seleção
            carregarDados(); // Recarrega lista
          } catch (e) {
            Alert.alert("Erro", "Falha ao excluir alguns itens.");
          }
      }}
    ]);
  };

  // --- MÁSCARAS ---
  const handleTimeMask = (text, setter) => {
    let val = text.replace(/\D/g, "");
    if (val.length >= 3) val = val.slice(0, 2) + ":" + val.slice(2, 4);
    setter(val.slice(0, 5));
  };

  const handleMoneyMask = (text) => {
    let value = text.replace(/\D/g, "");
    // Divide por 100 para ter os centavos (ex: 1500 -> 15.00)
    value = (Number(value) / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    // Adiciona ponto de milhar
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setValorFinanceiro(value);
  };

  // --- MODAIS ---
  const abrirModalCriacao = () => {
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
    setEventoEditando(ev); 
    setTitulo(ev.titulo);
    try {
        setHoraInicio(format(parseISO(ev.inicio), "HH:mm"));
        setHoraFim(format(parseISO(ev.fim), "HH:mm"));
    } catch {}
    setObservacao(ev.descricao || "");
    
    setGerarFinanceiro(ev.gerarFinanceiro || false);
    // Formata o valor double do banco para string brasileira visual
    setValorFinanceiro(ev.valor ? ev.valor.toFixed(2).replace('.', ',') : "");

    // Lembretes
    setLembreteValor(ev.lembreteValor ? String(ev.lembreteValor) : "");
    setLembreteUnidade(ev.lembreteUnidade || "MINUTOS");
    
    const cat = categories.find(c => c.name === ev.tipo || c.id === ev.categoria_id);
    if(cat) setSelectedCategory(cat);
    
    setModalVisivel(true); 
  };

  // --- SALVAR EVENTO (LÓGICA BLINDADA ERRO 500) ---
  const salvarEvento = async () => {
    if (!titulo.trim()) return Alert.alert("Atenção", "Nome do evento é obrigatório.");
    if (horaInicio.length !== 5 || horaFim.length !== 5) return Alert.alert("Atenção", "Preencha o horário (HH:mm).");

    // TRATAMENTO FINANCEIRO RIGOROSO
    let valorFinal = 0.0;
    
    if (gerarFinanceiro) {
      if (!valorFinanceiro) return Alert.alert("Erro", "Informe o valor financeiro.");
      
      // Remove pontos de milhar e troca vírgula por ponto
      // Ex: "1.200,50" -> "1200.50"
      const valorLimpo = valorFinanceiro.replace(/\./g, '').replace(',', '.');
      valorFinal = parseFloat(valorLimpo);

      if (isNaN(valorFinal) || valorFinal <= 0) {
        return Alert.alert("Erro", "Valor inválido. Use o formato 0,00");
      }
    }

    setSalvando(true);
    try {
      const dataIso = format(selectedDate, "yyyy-MM-dd");
      
      const payload = {
        titulo: titulo.trim(),
        inicio: `${dataIso}T${horaInicio}:00`,
        fim: `${dataIso}T${horaFim}:00`,
        categoria_id: selectedCategory.id,
        tipo: selectedCategory.name, 
        cor_categoria: selectedCategory.color,
        descricao: observacao || "",
        
        // DADOS ESPECÍFICOS PARA O BACKEND
        gerarFinanceiro: Boolean(gerarFinanceiro),
        valor: valorFinal, // Agora é um Number puro (Double), não string
        tipoFinanceiro: "RECEITA", // Segue a lógica solicitada
        
        // DADOS DE LEMBRETE
        lembreteValor: lembreteValor ? parseInt(lembreteValor) : null,
        lembreteUnidade: lembreteUnidade,
        
        status: "PENDENTE",
        comparecido: false
      };

      if (eventoEditando) {
        await api.put(`/eventos/${eventoEditando.id}`, payload);
      } else {
        await api.post("/eventos", payload);
      }

      setModalVisivel(false);
      carregarDados();
      
      Alert.alert("Sucesso", gerarFinanceiro ? "Evento e Receita criados!" : "Evento agendado!");

    } catch (e) {
      console.error("ERRO API:", e.response?.data);
      // Fallback para mensagem de erro genérica se não vier do backend
      const msgErro = e.response?.data?.error || "Verifique os dados ou a conexão.";
      Alert.alert("Erro ao Salvar", msgErro);
    } finally { setSalvando(false); }
  };

  // --- EXCLUSÃO INDIVIDUAL (LIXEIRA VERMELHA) ---
  const handleExcluirEvento = (id) => {
    Alert.alert("Excluir", "Apagar este evento?", [
      { text: "Cancelar" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/eventos/${id}`);
            setModalVisivel(false); 
            carregarDados();
          } catch (error) { Alert.alert("Erro", "Não foi possível excluir."); }
      }}
    ]);
  };

  const toggleComparecido = async (evento) => {
    try {
      const novoStatus = !evento.comparecido;
      // Atualização Otimista
      const novosEventos = eventos.map(e => e.id === evento.id ? { ...e, comparecido: novoStatus } : e);
      setEventos(novosEventos);
      await api.put(`/eventos/${evento.id}`, { comparecido: novoStatus });
    } catch (e) { carregarDados(); }
  };

  // --- GESTÃO DE CATEGORIAS (PERSISTÊNCIA LOCAL) ---
  const handleNovaCategoria = () => {
    setCatEditing({ id: Date.now().toString(), name: "", color: PRESET_COLORS[0], isNew: true });
    setModalCatVisivel(true);
  };

  const handleEditarCategoria = (cat) => {
    setCatEditing({ ...cat, isNew: false });
    setModalCatVisivel(true);
  };

  const salvarCategoriaPersistente = async () => {
    if (!catEditing.name?.trim()) return Alert.alert("Atenção", "Nome obrigatório.");
    
    let novaLista;
    if (catEditing.isNew) {
      novaLista = [...categories, { id: catEditing.id, name: catEditing.name, color: catEditing.color }];
    } else {
      novaLista = categories.map(c => c.id === catEditing.id ? catEditing : c);
    }

    setCategories(novaLista);
    // SALVA NO ASYNC STORAGE PARA NÃO SUMIR
    await AsyncStorage.setItem("@YourFlow:categories", JSON.stringify(novaLista));
    
    if (catEditing.isNew || selectedCategory.id === catEditing.id) {
        setSelectedCategory(catEditing.isNew ? novaLista[novaLista.length - 1] : catEditing);
    }
    
    setModalCatVisivel(false);
  };

  const excluirCategoriaPersistente = async () => {
    if (categories.length <= 1) return Alert.alert("Aviso", "Mantenha ao menos uma categoria.");
    
    const novaLista = categories.filter(c => c.id !== catEditing.id);
    setCategories(novaLista);
    await AsyncStorage.setItem("@YourFlow:categories", JSON.stringify(novaLista));
    
    setSelectedCategory(novaLista[0]);
    setModalCatVisivel(false);
  };

  // --- RENDER ---
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
    const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* HEADER: MUDA SE TIVER SELEÇÃO MÚLTIPLA */}
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
              <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.todayBtn, {backgroundColor: colors.surface}]} onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
                <Text style={[styles.todayText, {color: colors.primary}]}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <Ionicons name="chevron-forward" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.weekHeader}>
        {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((d, i) => (
           <Text key={i} style={styles.weekText}>{d}</Text> 
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* CALENDÁRIO VISUAL */}
        <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayEvents = eventos.filter(e => { try { return isSameDay(parseISO(e.inicio), day); } catch { return false; } });
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
                    <View key={index} style={[styles.eventChip, { backgroundColor: ev.cor_categoria || colors.primary }]}>
                      <Text style={styles.eventChipText} numberOfLines={1}>{ev.titulo}</Text>
                    </View>
                  ))}
                  {dayEvents.length > 3 && <Text style={{fontSize: 9, color: colors.textSecondary}}>+{dayEvents.length - 3}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* LISTA DE EVENTOS DO DIA */}
        <View style={[styles.detailsSection, isDesktop && { paddingHorizontal: 60 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.dateTitle}>{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase()}</Text>
            <TouchableOpacity style={[styles.btnAddMini, {backgroundColor: colors.primary}]} onPress={abrirModalCriacao}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {eventos.filter(e => { try { return isSameDay(parseISO(e.inicio), selectedDate); } catch { return false; } }).map(ev => {
             const isSelected = selectedEventIds.includes(ev.id);
             return (
              <View 
                key={ev.id} 
                style={[
                  styles.eventCard, 
                  { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { borderWidth: 2, backgroundColor: colors.primary + '15' }
                ]}
              >
                <TouchableOpacity onPress={() => toggleComparecido(ev)} style={{padding: 10, paddingLeft: 0}}>
                   <Ionicons name={ev.comparecido ? "checkbox" : "square-outline"} size={28} color={ev.comparecido ? colors.success : colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{flex: 1}}
                  onPress={() => handlePressEvento(ev)}
                  onLongPress={() => handleLongPressEvento(ev.id)} // SEGURAR ATIVA MULTI-SELEÇÃO
                >
                  <Text style={[styles.cardTitle, {color: colors.text}, ev.comparecido && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                    {ev.titulo}
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                     <View style={[styles.dotCategory, {backgroundColor: ev.cor_categoria || colors.primary}]} />
                     <Text style={[styles.cardInfo, {color: colors.textSecondary}]}>
                       {isValid(parseISO(ev.inicio)) ? format(parseISO(ev.inicio), "HH:mm") : "--:--"} - 
                       {isValid(parseISO(ev.fim)) ? format(parseISO(ev.fim), "HH:mm") : "--:--"}
                     </Text>
                  </View>
                </TouchableOpacity>

                {/* BOTÃO LIXEIRA CORRIGIDO */}
                <TouchableOpacity onPress={() => handleExcluirEvento(ev.id)} style={{padding: 10}}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )
          })}
          
          {eventos.filter(e => { try { return isSameDay(parseISO(e.inicio), selectedDate); } catch { return false; } }).length === 0 && (
             <Text style={styles.emptyText}>Toque no + para adicionar um evento.</Text>
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

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>NOME DO EVENTO</Text>
                <TextInput style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} value={titulo} onChangeText={setTitulo} placeholder="Ex: Evento, afazeres..." placeholderTextColor={colors.textSecondary}/>

                <View style={styles.rowBetween}>
                  <Text style={styles.label}>CATEGORIA</Text>
                  <TouchableOpacity onPress={handleNovaCategoria}><Text style={[styles.linkAction, {color: colors.primary}]}>+ Nova Categoria</Text></TouchableOpacity>
                </View>

                {/* LISTA DE CATEGORIAS (SEGURE PARA EDITAR) */}
                <View style={styles.catGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      onPress={() => setSelectedCategory(cat)}
                      onLongPress={() => handleEditarCategoria(cat)} // SEGURAR PARA EDITAR
                      delayLongPress={400}
                      style={[styles.catChip, selectedCategory.id === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                    >
                      <Text style={[styles.catText, selectedCategory.id === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hintText}>* Segure em uma categoria para editar ou excluir.</Text>

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

                {/* --- LEMBRETES VOLTARAM --- */}
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

                {/* --- FINANCEIRO CORRIGIDO --- */}
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

                <TouchableOpacity style={[styles.btnSave, {backgroundColor: colors.primary}]} onPress={salvarEvento} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>SALVAR</Text>}
                </TouchableOpacity>

              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* --- MODAL CATEGORIA (SALVA NO ASYNCSTORAGE) --- */}
      <Modal visible={modalCatVisivel} transparent animationType="fade" onRequestClose={() => setModalCatVisivel(false)}>
        <View style={styles.overlayCenter}>
          <View style={[styles.modalCatContent, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalCatTitle, {color: colors.text}]}>{catEditing.isNew ? "Criar Categoria" : "Editar Categoria"}</Text>
            <TextInput style={[styles.input, {backgroundColor: colors.inputBackground, color: colors.text}]} value={catEditing.name} onChangeText={t => setCatEditing({...catEditing, name: t})} placeholder="Nome" />
            <Text style={styles.label}>COR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(c => <TouchableOpacity key={c} onPress={() => setCatEditing({...catEditing, color: c})} style={[styles.colorCircle, { backgroundColor: c }, catEditing.color === c && styles.colorSelected]} />)}
            </View>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 15, width: '100%'}}>
                {!catEditing.isNew && <TouchableOpacity onPress={excluirCategoriaPersistente}><Text style={{color: colors.danger, fontWeight:'bold', padding: 10}}>Excluir</Text></TouchableOpacity>}
                <View style={{flexDirection:'row', gap: 10, flex: 1, justifyContent: 'flex-end'}}>
                   <TouchableOpacity onPress={() => setModalCatVisivel(false)}><Text style={{fontWeight:'bold', padding: 10, color: colors.textSecondary}}>Cancelar</Text></TouchableOpacity>
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
                    <TouchableOpacity key={m} style={styles.monthBtn} onPress={() => { setCurrentMonth(setMonth(setYear(new Date(), pickerAno), i)); setModalPickerVisivel(false); }}>
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
  dotCategory: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
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
  unitText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' }
});