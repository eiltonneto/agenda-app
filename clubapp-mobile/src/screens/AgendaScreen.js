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
  parseISO, setYear, setMonth, isValid, addHours, addDays
} from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
// V3 Importa o estado global que já vem do Bootstrap
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
  const { eventosGlobais, setEventosGlobais, receitasGlobais, setReceitasGlobais, categoriasGlobais, setCategoriasGlobais } = useAuth();

  const eventos = eventosGlobais || [];

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
    async function loadCategoriesFallback() {
      if (categoriasGlobais?.length > 0) {
        setCategories(categoriasGlobais);
        setSelectedCategory(current => categoriasGlobais.find(c => c.id === current?.id) || categoriasGlobais[0]);
        return;
      }
      try {
        const saved = await AsyncStorage.getItem("@YourFlow:categories");
        if (saved) {
          const parsed = JSON.parse(saved);
          setCategories(parsed);
          if (parsed.length > 0) setSelectedCategory(parsed[0]);
        }
      } catch (e) { console.log("Erro carregar categorias", e); }
    }
    loadCategoriesFallback();
  }, [categoriasGlobais]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.exp) }).start();
  }, [currentMonth]);

  const treatError = (error) => {
    let mensagem = error.response?.data?.error || "Ocorreu um erro inesperado.";
    if (error.message?.includes("Network Error")) mensagem = "Sem conexão com o servidor.";
    setErrorMessage(mensagem);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  // V3: Busca silenciosa (Background Fetch) apenas ao mudar o mês manualmente
  const mudarMesSilenciosamente = (novaData) => {
    setCurrentMonth(novaData);
    // Dispara a requisição em background sem mostrar loading
    api.get('/eventos').then(res => {
      if (Array.isArray(res.data)) setEventosGlobais(res.data);
    }).catch(e => console.log("Erro no background fetch:", e.message));
  };

  // --- LÓGICA DE EVENTOS (OPTIMISTIC UI) ---
  const handleLongPressEvent = (id) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter(itemId => itemId !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  const handlePressEvent = (ev) => {
    if (selectedEventIds.length > 0) {
      handleLongPressEvent(ev.id);
    } else {
      OpenModalEdition(ev);
    }
  };

  const deleteSelection = () => {
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
        treatError(e); 
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

const handleDeleteEvent = (id) => {
    const executeDelete = async () => {
      const backupEvento = eventosGlobais.find(e => e.id === id); // Backup do evento e estado anterior para rollback caso o servidor falhe. 
      
      // OTIMISTA AGENDA: Remove da tela instantaneamente
      setModalVisivel(false); 
      setEventosGlobais(prev => prev.filter(e => e.id !== id));

      // OTIMISTA FINANCEIRO ABSOLUTO
      let backupReceita = null;
      if (backupEvento) {
         // Pega só o "formato da data" e transforma o título em minúsculas
         const dataIso = backupEvento.inicio.split('T')[0]; 
         const tituloBusca = backupEvento.titulo.toLowerCase().trim();

         setReceitasGlobais(prev => {
            // Guarda o backup por segurança
            backupReceita = prev.find(r => r.eventDate && r.eventDate.startsWith(dataIso) && r.descricao && r.descricao.toLowerCase().includes(tituloBusca));
            
            // apaga instantaneamente
            return prev.filter(r => {
               const mesmaData = r.eventDate && r.eventDate.startsWith(dataIso);
               const mesmaDescricao = r.descricao && r.descricao.toLowerCase().includes(tituloBusca);
               
               // Se for a mesma data e a descrição contiver o título, DELETA (return false)
               return !(mesmaData && mesmaDescricao);
            });
         });
      }

      // 3. Executa a exclusão real no servidor
      try {
        await api.delete(`/eventos/${id}`); // Espera a resposta da request delete para continuar o processo, garantindo que só atualizamos o financeiro se a exclusão do evento for bem sucedida.
        
        // ATUALIZAÇÃO FORÇADA: Busca os dados limpos no banco para garantir a integridade
        if (backupEvento) {
           const partesData = backupEvento.inicio.split('T')[0].split('-'); // ["2026", "02", "21"]
           const ano = parseInt(partesData[0], 10);
           const mes = parseInt(partesData[1], 10);
           
           const req = await api.get("/receitas", { params: { mes, ano } });
           setReceitasGlobais(prev => {
              const outras = prev.filter(p => p.eventDate && !p.eventDate.startsWith(`${ano}-${String(mes).padStart(2, '0')}`));
              return [...outras, ...req.data];
           });
        }

      } catch (error) { 
        // ROLLBACK
        setEventosGlobais(prev => [...prev, backupEvento]); // Estado anterior + evento apagado
        if (backupReceita) setReceitasGlobais(prev => [...prev, backupReceita]); // Devolve o estado anterior e a receita apagada com a const backupReceita, garantindo que o usuário não perca dados mesmo em caso de falha de rede ou erro do servidor.
        treatError(error); 
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm("Deseja apagar este evento e seu lançamento financeiro?")) executeDelete();
    } else {
      Alert.alert("Excluir", "Apagar este evento e seu lançamento financeiro?", [
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

  const OpenModalCreated = () => {
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

  const OpenModalEdition = (ev) => {
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

  const createEvent = async () => {
    setErrorMessage("");

    // --- VALIDAÇÕES ---
    // Antes de qualquer coisa, verifica se o formulário foi preenchido corretamente, se qualquer validação falhar, mostra o erro e para tudo com return.
    if (!titulo.trim()) return setErrorMessage("O nome do evento é obrigatório."); // Se não existir o nome do evento
    if (horaInicio.length !== 5 || horaFim.length !== 5) return setErrorMessage("Preencha o horário completo (HH:mm)."); // Se o horário for insuficiente em caracteres (5 caracteres)
    if (horaInicio === horaFim) return setErrorMessage("A hora de início e término não podem ser iguais.");// Horário de início não pode ser igual ao de término. 

    let valorFinal = 0.0; // Variável que recebe o valor da integração financeira caso marcada o switch "lançar no financeiro" e passa para o payload. Se o switch não for marcado, o valor fica 0 e o backend ignora, garantindo que o evento seja criado mesmo sem valor financeiro, mantendo a flexibilidade para o usuário.
    if (gerarFinanceiro) { // Se financeiro for verdadeiro (ou seja, o switch "Lançar no Financeiro" estiver ativado), aí sim a validação do valor financeiro é obrigatória. Se o switch não estiver ativado, o valor financeiro é irrelevante e não bloqueia a criação do evento.
      if (!valorFinanceiro) return setErrorMessage("Informe o valor financeiro."); // Caso o usuário não digite o valor da receita do evento.
      // Formatação para o banco de dados - o usuário digita o valor (brasileiro) com pontos e vírgula, mas o backend espera um número decimal com ponto. Então aqui a gente faz a conversão, tirando os pontos de milhar e substituindo a vírgula decimal por ponto. Ex: "1.234,56" vira "1234.56" e depois é convertido para número 1234.56.
      const valorLimpo = valorFinanceiro.replace(/\./g, '').replace(',', '.'); // formatação é a inicialização da variável "valorLimpo". Ela recebe o valor do input "valorFinanceiro" e aplica duas substituições usando expressões regulares: a primeira remove todos os pontos (usados como separadores de milhar no formato brasileiro) e a segunda substitui a vírgula (usada como separador decimal)
      valorFinal = parseFloat(valorLimpo); // Conversão de entrada para o tipo do banco de dados (parseamento para float).
      if (isNaN(valorFinal) || valorFinal <= 0) return setErrorMessage("Valor financeiro inválido."); // Validação para garantir que o valor financeiro seja um número válido e positivo. Se a conversão resultar em NaN (Not a Number) ou se o valor for zero ou negativo, a função exibe uma mensagem de erro e interrompe a execução com return, evitando que o evento seja criado com um valor financeiro inválido.
    }

    // --- CONSTRUÇÃO DAS DATAS ---
    const dataIso = format(selectedDate, "yyyy-MM-dd"); // Variável que recebe a data selecionada formatada em ISO (yyyy-MM-dd), que é o formato esperado pelo backend. O formato ISO é um padrão internacional para representação de datas, garantindo consistência e evitando problemas de fuso horário ou formatação regional. O backend espera as datas nesse formato para processar corretamente os eventos e suas integrações financeiras.
    let dataFimIso = dataIso;
    if (horaFim < horaInicio) { // No caso de um evento começar em um dia e terminar em outro (ex: inicio: 23:00 | fim: 01:00), o backend precisa receber a data de término correta, que é do dia seguinte. Então aqui a gente verifica se a hora de término é menor que a hora de início, e se for, significa que o evento passa da meia noite, aí a gente calcula a data de término como sendo o dia seguinte usando a função addDays do date-fns, garantindo que o backend crie o evento com a duração correta mesmo que o usuário só tenha preenchido as horas.
      const diaSeguinte = addDays(selectedDate, 1);
      dataFimIso = format(diaSeguinte, "yyyy-MM-dd");
    }

    const inicioFormatado = `${dataIso}T${horaInicio}:00`;
    const fimFormatado = `${dataFimIso}T${horaFim}:00`;

    const payload = { // Carga útil, dados essenciais reais que será enviada para o servidor. O payload é construído com base nos dados do formulário, mas também inclui campos calculados e formatados corretamente para o backend, como as datas em formato ISO, o valor financeiro convertido para número, e a categoria selecionada.
      titulo: titulo.trim(),// A logica da hora também vai junto ,se o evento for até meia noite, o dataFimIso é o mesmo dia, se passar de meia noite, o dataFimIso é do dia seguinte. Assim, o backend recebe as datas já corretas para criar o evento com a duração certa, mesmo que o usuário só tenha preenchido as horas.
      inicio: inicioFormatado,
      fim: fimFormatado,
      categoria_id: selectedCategory.id,
      tipo: selectedCategory.name,
      cor_categoria: selectedCategory.color,
      descricao: observacao || "",
      gerarFinanceiro: Boolean(gerarFinanceiro),
      valor: valorFinal,
      tipoFinanceiro: "RECEITA",
      lembreteValor: lembreteValor ? parseInt(lembreteValor) : null,
      lembreteUnidade: lembreteUnidade,
      status: "PENDENTE",
      comparecido: eventoEditando ? eventoEditando.comparecido : false
    };

    // --- FECHA O MODAL E FAZ O UPDATE OTIMISTA ---
    setModalVisivel(false);

    const tempId = eventoEditando ? eventoEditando.id : `temp-${Date.now()}`;
    const eventoOtimista = { id: tempId, ...payload, temp: !eventoEditando };

    // Guardamos backups ANTES de qualquer mudança otimista.
    // São os "pontos de restauração" para o caso de erro da API.
    const backupEventos = [...eventosGlobais];
    const backupReceitas = [...receitasGlobais];

    if (eventoEditando) {
      setEventosGlobais(prev => prev.map(e => e.id === tempId ? { ...e, ...payload } : e));
    } else {
      setEventosGlobais(prev => [...prev, eventoOtimista]);

      if (gerarFinanceiro) {
        const receitaOtimista = {
          id: `rec-${tempId}`,
          descricao: `${selectedCategory.name}: ${payload.titulo}`,
          valor: payload.valor,
          status: "PENDENTE",
          eventDate: dataIso,
          paidAt: null,
          tipo: selectedCategory.name,
          tipo_financeiro: "RECEITA",
          temp: true
        };
        setReceitasGlobais(prev => [...prev, receitaOtimista]);
      }
    }

    // --- REQUISIÇÃO EM BACKGROUND ---
    try {
      if (eventoEditando) {
        await api.put(`/eventos/${tempId}`, payload);
        setEventosGlobais(prev => prev.map(e => e.id === tempId ? { ...e, temp: false } : e));
      } else {
        const response = await api.post("/eventos", payload);
        const eventoOficial = { ...response.data, temp: false };
        setEventosGlobais(prev => prev.map(e => e.id === tempId ? eventoOficial : e));
      }

      if (gerarFinanceiro) {
        const mes = selectedDate.getMonth() + 1;
        const ano = selectedDate.getFullYear();
        const req = await api.get("/receitas", { params: { mes, ano } });
        setReceitasGlobais(prev => {
          const outras = prev.filter(p => p.eventDate && !p.eventDate.startsWith(`${ano}-${String(mes).padStart(2, '0')}`));
          return [...outras, ...req.data];
        });
      }

    } catch (e) {
      // ROLLBACK COMPLETO: Restaura agenda e financeiro ao estado anterior
      setEventosGlobais(backupEventos);
      setReceitasGlobais(backupReceitas);

      // REABRE O MODAL com os dados intactos para o usuário não perder o que digitou
      setModalVisivel(true);

      // MENSAGEM CONTEXTUAL: Conflito de horário vs. erro genérico
      if (e.response?.status === 409) {
        setErrorMessage("⚠️ Conflito de horário: este local já está reservado neste período.");
      } else if (e.message?.includes("Network Error")) {
        setErrorMessage("Sem conexão. Verifique sua internet e tente novamente.");
      } else {
        setErrorMessage(e.response?.data?.error || "Erro ao salvar. Tente novamente.");
      }
    }
  };

const toggleAttended = async (evento) => { // Comparecido ?
    // Bloqueia o clique se o evento ainda for temporário (salvando no Render)
    if (evento.temp) return;

    const novoStatus = !evento.comparecido;
   
    // Backups para caso a internet caia
    const backupEventos = [...eventosGlobais];
    const backupReceitas = [...receitasGlobais];

    // OTIMISMO NA AGENDA: Muda o ícone na mesma hora
    setEventosGlobais(prev => prev.map(e => e.id === evento.id ? { ...e, comparecido: novoStatus } : e));

    // OTIMISMO NO FINANCEIRO: A mágica da integração!
    
    const agora = new Date().toISOString();
    const dataIso = evento.inicio.split('T')[0]; 

    setReceitasGlobais(prev => prev.map(r => {

  // Busca pelo eventDate e pela descrição para dar a baixa otimista
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
      // Busca pelo eventDate e pela descrição para dar a baixa otimista
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
      // REQUISIÇÃO SIMPLES E DIRETA (Apenas avisa o banco da mudança do status)
      await api.put(`/eventos/${evento.id}`, { comparecido: novoStatus });
      
      // ATUALIZAÇÃO SILENCIOSA DO FINANCEIRO (Usando o 'new Date' que corrigimos)
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
      treatError(e);
    }
  };

  // GESTÃO DE CATEGORIAS (OTIMISTIC UI + PERSISTÊNCIA LOCAL -> SWR DE CATEGORIAS)
  const handleNewCategory = () => {
    setErrorMessage("");
    setCatEditing({ id: Date.now().toString(), name: "", color: PRESET_COLORS[0], isNew: true });
    setModalCatVisivel(true);
  };

  const handleEditCategory = (cat) => {
    setErrorMessage("");
    setCatEditing({ ...cat, isNew: false });
    setModalCatVisivel(true);
  };

  const saveCategoryPersistent = async () => {
    if (!catEditing.name?.trim()) return setErrorMessage("O nome da categoria é obrigatório.");
    let novaLista;
    if (catEditing.isNew) {
      novaLista = [...categories, { id: catEditing.id, name: catEditing.name, color: catEditing.color }];
    } else {
      novaLista = categories.map(c => c.id === catEditing.id ? catEditing : c);
    }
    try {
      const response = catEditing.isNew
        ? await api.post("/categorias-evento", { nome: catEditing.name.trim(), cor: catEditing.color })
        : await api.put(`/categorias-evento/${catEditing.id}`, { nome: catEditing.name.trim(), cor: catEditing.color });
      const salva = { id: response.data.id, name: response.data.nome, color: response.data.cor };
      novaLista = catEditing.isNew
        ? [...categories, salva]
        : categories.map(c => c.id === salva.id ? salva : c);
      setCategories(novaLista);
      setCategoriasGlobais(novaLista);
      await AsyncStorage.setItem("@YourFlow:categories", JSON.stringify(novaLista));
    } catch (error) {
      return treatError(error);
    }
    if (catEditing.isNew || selectedCategory.id === catEditing.id) {
        setSelectedCategory(catEditing.isNew ? novaLista[novaLista.length - 1] : catEditing);
    }
    setModalCatVisivel(false);
  };

  const deleteCategoryPersistent = async () => {
    if (categories.length <= 1) return setErrorMessage("Mantenha ao menos uma categoria.");
    try {
      await api.delete(`/categorias-evento/${catEditing.id}`);
    } catch (error) {
      return treatError(error);
    }
    const novaLista = categories.filter(c => c.id !== catEditing.id);
    setCategories(novaLista);
    setCategoriasGlobais(novaLista);
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

      <ScrollView showsVerticalScrollIndicator={Platform.OS === "web"}>
        <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            // endo diretamente do estado global
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
            <TouchableOpacity style={[styles.btnAddMini, {backgroundColor: colors.primary}]} onPress={OpenModalCreated}>
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
                <TouchableOpacity onPress={() => toggleAttended(ev)} style={{padding: 10, paddingLeft: 0}}>
                   <Ionicons name={ev.comparecido ? "checkbox" : "square-outline"} size={28} color={ev.comparecido ? colors.success : colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{flex: 1}}
                  onPress={() => handlePressEvent(ev)}
                  onLongPress={() => handleLongPressEvent(ev.id)}
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

                <TouchableOpacity onPress={() => handleDeleteEvent(ev.id)} style={{padding: 10}}>
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

      {/* MODAL DE EVENTO */}
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

              <ScrollView showsVerticalScrollIndicator={Platform.OS === "web"}>
                <Text style={styles.label}>NOME DO EVENTO</Text>
                <TextInput style={[styles.input, {color: colors.text, backgroundColor: colors.inputBackground}]} value={titulo} onChangeText={setTitulo} placeholder="Ex: Ocasião, Evento..." placeholderTextColor={colors.textSecondary}/>

                <View style={styles.rowBetween}>
                  <Text style={styles.label}>LOCAL / CATEGORIA</Text>
                  <TouchableOpacity onPress={handleNewCategory}><Text style={[styles.linkAction, {color: colors.primary}]}>+ Novo Local</Text></TouchableOpacity>
                </View>

                <View style={styles.catGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      onPress={() => setSelectedCategory(cat)}
                      onLongPress={() => handleEditCategory(cat)} 
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

                {/* O botão salva instantaneamente e não fica preso em 'loading' */}
                <TouchableOpacity style={[styles.btnSave, {backgroundColor: colors.primary}]} onPress={createEvent}>
                  <Text style={styles.btnSaveText}>SALVAR EVENTO</Text>
                </TouchableOpacity>

              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/*  MODAL CATEGORIA  */}
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
                {!catEditing.isNew && <TouchableOpacity onPress={deleteCategoryPersistent}><Text style={{color: colors.danger, fontWeight:'bold', padding: 10}}>Excluir</Text></TouchableOpacity>}
                <View style={{flexDirection:'row', gap: 10, flex: 1, justifyContent: 'flex-end'}}>
                   <TouchableOpacity onPress={() => { setModalCatVisivel(false); setErrorMessage(""); }}><Text style={{fontWeight:'bold', padding: 10, color: colors.textSecondary}}>Cancelar</Text></TouchableOpacity>
                   <TouchableOpacity onPress={saveCategoryPersistent} style={{backgroundColor: colors.primary, padding: 10, borderRadius: 8}}><Text style={{color:'#fff', fontWeight:'bold'}}>Salvar</Text></TouchableOpacity>
                </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ANO */}
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