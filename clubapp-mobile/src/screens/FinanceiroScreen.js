import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, addMonths, subMonths, setMonth, setYear, parseISO, isValid, getDate, getMonth, getYear, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
// Importa o estado global hidratado pelo Bootstrap
import { useAuth } from "../context/AuthContext";

const PRESET_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b", "#1e293b"];
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Helper de Data
const safeFormatDate = (dateString, pattern = "dd/MM") => {
  try {
    if (!dateString) return "--/--";
    const date = parseISO(dateString);
    return isValid(date) ? format(date, pattern, { locale: ptBR }) : "--/--";
  } catch (e) { return "--/--"; }
};

export default function FinanceiroScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 800;


  const { receitasGlobais, setReceitasGlobais, despesasGlobais, setDespesasGlobais } = useAuth();

  // ESTADOS
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState("DESPESA"); 
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Guarda os IDs temporários que o usuário apagou antes de salvar
  const excluidosTemporarios = useRef(new Set());

  // CATEGORIAS 
  const [categories, setCategories] = useState([
    { id: '1', name: 'Alimentação', color: '#f59e0b', type: 'DESPESA', backendType: 'VARIAVEL' },
    { id: '2', name: 'Transporte', color: '#3b82f6', type: 'DESPESA', backendType: 'VARIAVEL' },
    { id: '3', name: 'Salário', color: '#10b981', type: 'RECEITA', backendType: 'SALARIO' },
    { id: '4', name: 'Vendas', color: '#8b5cf6', type: 'RECEITA', backendType: 'VENDA' },
    { id: '5', name: 'Serviços', color: '#f43f5e', type: 'RECEITA', backendType: 'SERVICO' },
    { id: '6', name: 'Outros', color: '#64748b', type: 'DESPESA', backendType: 'OUTRO' }
  ]);
  
  const [modalCatVisivel, setModalCatVisivel] = useState(false);
  const [catEditing, setCatEditing] = useState({ id: '', name: '', color: PRESET_COLORS[0], type: 'DESPESA', isNew: true });

  // Modais e Pickers
  const [modalVisivel, setModalVisivel] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [modalMesAnoVisivel, setModalMesAnoVisivel] = useState(false);
  const [pickerAnoHeader, setPickerAnoHeader] = useState(new Date().getFullYear());
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);

  // Formulário
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState(""); 
  const [valor, setValor] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dataSelecionadaForm, setDataSelecionadaForm] = useState(new Date()); 
  const [status, setStatus] = useState("PENDENTE");
// 🚀 1. Carimbo de texto (ex: "2024-05") imune a erros do celular
  const prefixoMesAtual = useMemo(() => {
    const ano = dataReferencia.getFullYear();
    const mes = String(dataReferencia.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }, [dataReferencia]);

  // 🚀 2. O Filtro Blindado (Regime de Caixa)
  const transacoesExibidas = useMemo(() => {
    const listaOriginal = abaAtiva === "RECEITA" ? receitasGlobais : despesasGlobais;
    
    return listaOriginal.filter(t => {
      // REGRA 1: Pendentes SÓ aparecem no mês original do agendamento
      if (t.status === "PENDENTE") {
        return t.eventDate && t.eventDate.startsWith(prefixoMesAtual);
      }
      // REGRA 2: Pagos SÓ aparecem no mês exato em que o dinheiro entrou/saiu
      if (t.status === "RECEBIDA" || t.status === "PAGA") {
        return t.paidAt && t.paidAt.startsWith(prefixoMesAtual);
      }
      return false;
    });
  }, [receitasGlobais, despesasGlobais, abaAtiva, prefixoMesAtual]);

  // 🚀 3. Cálculo de Saldos
  const { resumoRealizado, resumoPrevisto } = useMemo(() => {
    let recReal = 0, despReal = 0;
    let pendenteTotal = 0;

    receitasGlobais.forEach(t => {
      if (t.status === 'RECEBIDA' && t.paidAt && t.paidAt.startsWith(prefixoMesAtual)) {
        recReal += Number(t.valor);
      } else if (t.status === 'PENDENTE' && t.eventDate && t.eventDate.startsWith(prefixoMesAtual)) {
        pendenteTotal += Number(t.valor);
      }
    });

    despesasGlobais.forEach(t => {
      if (t.status === 'PAGA' && t.paidAt && t.paidAt.startsWith(prefixoMesAtual)) {
        despReal += Number(t.valor);
      }
    });

    return {
      resumoRealizado: { receitas: recReal, despesas: despReal, saldo: recReal - despReal },
      resumoPrevisto: { saldo: pendenteTotal } 
    };
  }, [receitasGlobais, despesasGlobais, prefixoMesAtual]);
  // --- ATALHOS WEB ---
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleEsc = (e) => { 
        if (e.key === "Escape") { 
          if (modalCatVisivel) setModalCatVisivel(false);
          else if (modalVisivel) setModalVisivel(false);
          else if (modalMesAnoVisivel) setModalMesAnoVisivel(false);
          else setSelectedIds([]); 
        }
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [modalCatVisivel, modalVisivel, modalMesAnoVisivel]);

  // --- MÁSCARA DE MOEDA (BRL) ---
  const handleMoneyMask = (text) => {
    let val = text.replace(/\D/g, "");
    if (!val) { setValor(""); return; }
    val = (Number(val) / 100).toFixed(2);
    val = val.replace(".", ",");
    val = val.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setValor(val);
  };

  const formatarValorInicial = (num) => {
    if (!num) return "";
    let val = Number(num).toFixed(2).replace(".", ",");
    return val.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  };

  const tratarErro = (error) => {
    let mensagem = error.response?.data?.error || error.response?.data?.message || "Ocorreu um erro inesperado.";
    if (error.message?.includes("Network Error")) mensagem = "Sem conexão com o servidor.";
    setErrorMessage(mensagem);
    setTimeout(() => setErrorMessage(""), 5000); 
  };

  // 🚀 V3: BUSCA EM BACKGROUND (Sem travar a tela)
  const carregarDadosBackground = useCallback(async () => {
    setErrorMessage("");
    try {
      const mes = dataReferencia.getMonth() + 1; 
      const ano = dataReferencia.getFullYear();
      
      const [resRec, resDesp] = await Promise.all([
        api.get("/receitas", { params: { mes, ano } }),
        api.get("/despesas", { params: { mes, ano } })
      ]);

      const receitas = Array.isArray(resRec.data) ? resRec.data.map(i => ({...i, tipo_financeiro: 'RECEITA'})) : [];
      const despesas = Array.isArray(resDesp.data) ? resDesp.data.map(i => ({...i, tipo_financeiro: 'DESPESA'})) : [];
      
      setReceitasGlobais(prev => {
          // 🚀 DEDUPLICAÇÃO ABSOLUTA: O Map impede que o mesmo ID exista duas vezes
          const mapa = new Map(prev.map(p => [p.id, p]));
          receitas.forEach(r => mapa.set(r.id, r));
          return Array.from(mapa.values());
      });
      
      setDespesasGlobais(prev => {
         const mapa = new Map(prev.map(p => [p.id, p]));
          despesas.forEach(d => mapa.set(d.id, d));
          return Array.from(mapa.values());
      });

    } catch (error) { 
        console.log("Erro no background fetch:", error.message);
    } 
  }, [dataReferencia, setReceitasGlobais]);
  

  useEffect(() => { carregarDadosBackground(); }, [carregarDadosBackground]);
  

  // --- 🚀 OTIMISTA: TOGGLE STATUS ---
    const toggleStatus = async (item) => {
    const isReceita = abaAtiva === "RECEITA";
    const statusPago = isReceita ? "RECEBIDA" : "PAGA";
    const novoStatus = item.status === statusPago ? "PENDENTE" : statusPago;
    
    // 🗓️ Se estiver pagando, carimba a data de hoje. Se estiver voltando para pendente, limpa.
    const agora = new Date().toISOString();
    const novoPaidAt = novoStatus === statusPago ? agora : null;

    const setter = isReceita ? setReceitasGlobais : setDespesasGlobais;
    const backupItem = { ...item };

    // Atualização otimista
    setter(prev => prev.map(t => t.id === item.id ? { ...t, status: novoStatus, paidAt: novoPaidAt } : t));
    
    try {
      await api.patch(`${isReceita ? "/receitas" : "/despesas"}/${item.id}/status`, { 
        status: novoStatus,
        paidAt: novoPaidAt 
      }); 
    } catch (e) { 
      tratarErro(e);
      setter(prev => prev.map(t => t.id === item.id ? backupItem : t));
    }
  };

  // --- 🚀 OTIMISTA: EXCLUIR MÚLTIPLOS ---
  const excluirSelecionados = async () => {
    const executeDelete = async () => {
        const isReceita = abaAtiva === "RECEITA";
        const route = isReceita ? "/receitas" : "/despesas";
        const setter = isReceita ? setReceitasGlobais : setDespesasGlobais;
        const idsToDelete = [...selectedIds];
        
        // Backup para possível rollback
        const listaAtual = isReceita ? receitasGlobais : despesasGlobais;
        const backups = listaAtual.filter(t => idsToDelete.includes(t.id));
        
        // OTIMISTA: Limpa a tela
        setSelectedIds([]); 
        setter(prev => prev.filter(t => !idsToDelete.includes(t.id)));

        try {
            await api.post(`${route}/excluir-massa`, { ids: idsToDelete });
        } catch (err) { 
            setter(prev => [...prev, ...backups]); // Reverte
            tratarErro(err); 
        } 
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Tem certeza que deseja apagar os ${selectedIds.length} itens selecionados?`)) executeDelete();
    } else {
      Alert.alert("Excluir Selecionados", `Tem certeza que deseja apagar ${selectedIds.length} itens?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Apagar", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  // EXCLUIR RÁPIDO 
const excluirItemRapido = async (item) => {
    const execute = async () => {
       const isReceita = abaAtiva === "RECEITA";
       const route = isReceita ? "/receitas" : "/despesas";
       const setter = isReceita ? setReceitasGlobais : setDespesasGlobais;
       const backupItem = { ...item };

       // Remove da tela primeiro
       setter(prev => prev.filter(t => t.id !== item.id));

       if (item.temp) { // Se o item ainda for temporário
         excluidosTemporarios.current.add(item.id); // anota que esse ID temporário foi excluído para o caso de a criaçao ainda não ter sido confirmada pelo servidor. Assim, quando a resposta do servidor chegar, o sistema saberá que deve apagar o item real correspondente silenciosamente, evitando que o card "fantasma" apareça na tela.
         return; // Não manda delete ainda porque nessa condição, o id ainda não existe no banco
       }

       try {
         await api.delete(`${route}/${item.id}`);
       } catch (e) { 
         // Tra: Se o erro for 404, não faz nada. O card já sumiu da tela. Outros status code são tratados normamelmente e o card é devolvido para o usuário.
         if (e.response && e.response.status === 404) {
            console.log("Card fantasma resolvido: já estava deletado no banco.");
         } else {
            // Se for outro erro, devolve o card pra tela
            setter(prev => [...prev, backupItem]); 
            tratarErro(e); 
         }
       }
    };
    if (Platform.OS === 'web') {
      if(window.confirm(`Excluir "${item.descricao}"?`)) execute();
    } else {
      Alert.alert("Confirmar", "Excluir este lançamento?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim", style: "destructive", onPress: execute }
      ]);
    }
  };

  const excluirTransacaoAtual = async () => {
    const executeDelete = async () => {
       const isReceita = abaAtiva === "RECEITA";
       const route = isReceita ? "/receitas" : "/despesas";
       const setter = isReceita ? setReceitasGlobais : setDespesasGlobais;
       const backupItem = { ...transacaoEditando };
       const id = transacaoEditando.id;

       setModalVisivel(false);
       setter(prev => prev.filter(t => t.id !== id));

        try {
         await api.delete(`${route}/${id}`);
        } catch (e) { 
         if (e.response && e.response.status === 404) {
            console.log("Card fantasma: já estava deletado no banco.");
         } else {
            setter(prev => [...prev, backupItem]);
            tratarErro(e); 
         }
       }
    };
    if (Platform.OS === 'web') {
      if(window.confirm("Deseja realmente excluir este lançamento?")) executeDelete();
    } else {
      Alert.alert("Excluir", "Deseja realmente excluir este lançamento?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Excluir", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  // MODAIS DE EDIÇÃO
  const abrirModalNovo = () => {
    setErrorMessage("");
    setTransacaoEditando(null);
    setDescricao("");
    setObservacao("");
    setValor("");
    setDataSelecionadaForm(new Date());
    setShowInlineDatePicker(false);
    setStatus("PENDENTE");
    
    const catsCompativeis = categories.filter(c => c.type === abaAtiva);
    setSelectedCategory(catsCompativeis.length > 0 ? catsCompativeis[0] : null);
    setModalVisivel(true);
  };

  const abrirModalEditar = (item) => {
    setErrorMessage("");
    setTransacaoEditando(item);
    setDescricao(item.descricao);
    setObservacao(item.observacao || ""); 
    setValor(formatarValorInicial(item.valor)); 
    setShowInlineDatePicker(false);
    
    const catId = item.categoria_id;
    let foundCat = categories.find(c => c.id === catId);
    if (!foundCat) {
      const catNome = abaAtiva === "RECEITA" ? item.tipo : item.categoria;
      foundCat = categories.find(c => c.name === catNome);
    }
    if (foundCat) {
      setSelectedCategory(foundCat);
    } else {
      setSelectedCategory({ id: 'temp', name: item.tipo || item.categoria || 'Geral', color: '#999', type: abaAtiva, backendType: 'OUTRO' });
    }

    const dataIso = item.eventDate;
    setDataSelecionadaForm(dataIso ? parseISO(dataIso) : new Date());
    setStatus(item.status);
    setModalVisivel(true);
  };

  // OTIMISTA: SALVAR TRANSACAO
  const salvarTransacao = async () => {
    setErrorMessage("");

    if (!descricao.trim()) return setErrorMessage("Digite um título/nome para o lançamento.");
    if (!valor) return setErrorMessage("Digite um valor válido.");
    if (!selectedCategory) return setErrorMessage("Selecione uma categoria.");

    const valorLimpo = valor.replace(/\./g, '').replace(',', '.');
    const valorFloat = parseFloat(valorLimpo);
    
    if (isNaN(valorFloat) || valorFloat <= 0) return setErrorMessage("Valor inválido.");
    
    const dataFormatada = format(dataSelecionadaForm, "yyyy-MM-dd");
    const isReceita = abaAtiva === "RECEITA";

  const payload = { 
    descricao: descricao.trim(), 
    observacao: observacao.trim(), 
    valor: valorFloat, 
    status: status,

    // MUDANÇA 
    // Saem as chaves condicionais, entra o campo único que definimos no Prisma
    eventDate: dataFormatada, 

    // distinção de tipo/categoria apenas para a lógica de negócio do Backend
    [isReceita ? "tipo" : "categoria"]: selectedCategory.backendType || "OUTRO",
  };

    const route = isReceita ? "/receitas" : "/despesas";
    const setter = isReceita ? setReceitasGlobais : setDespesasGlobais;
    
    // OTIMISTA: Fecha modal e atualiza interface
    setModalVisivel(false); 
    const tempId = transacaoEditando ? transacaoEditando.id : `temp-${Date.now()}`;
    const transacaoOtimista = { id: tempId, ...payload, temp: !transacaoEditando };
    const backupItem = transacaoEditando ? (isReceita ? receitasGlobais : despesasGlobais).find(t => t.id === tempId) : null;

    if (transacaoEditando) {
      setter(prev => prev.map(t => t.id === tempId ? { ...t, ...payload } : t));
    } else {
      setter(prev => [...prev, transacaoOtimista]);
    }

    // BACKGROUND REQUEST
    try {
      if (transacaoEditando) {
        await api.put(`${route}/${tempId}`, payload);
        setter(prev => prev.map(t => t.id === tempId ? { ...t, temp: false } : t));
      } else {
        const res = await api.post(route, payload);
        const itemOficial = { ...res.data, tipo_financeiro: isReceita ? 'RECEITA' : 'DESPESA', temp: false };

        if (excluidosTemporarios.current.has(tempId)) {
           // O usuário apagou da tela enquanto esperava! 
           // Então manda o servidor apagar o ID real silenciosamente.
           await api.delete(`${route}/${itemOficial.id}`);
           excluidosTemporarios.current.delete(tempId); // Limpa o caderninho
        } else {
           // O usuário não apagou. Então troca o ID temporário pelo Real.
           setter(prev => prev.map(t => t.id === tempId ? itemOficial : t));
        }
      }

    } catch (e) {
      if (transacaoEditando) {
        setter(prev => prev.map(t => t.id === tempId ? backupItem : t));
      } else {
        setter(prev => prev.filter(t => t.id !== tempId));
      }
      tratarErro(e);
    }
  };

  // GESTÃO DE CATEGORIAS 
  const abrirNovaCategoria = () => {
    setErrorMessage("");
    setCatEditing({ id: Date.now().toString(), name: "", color: PRESET_COLORS[0], type: abaAtiva, backendType: 'OUTRO', isNew: true });
    setModalCatVisivel(true);
  };

  const abrirEditarCategoria = (cat) => {
    setErrorMessage("");
    setCatEditing({ ...cat, isNew: false });
    setModalCatVisivel(true);
  };

  const salvarCategoria = () => {
    if (!catEditing.name?.trim()) return setErrorMessage("Nome da categoria é obrigatório.");
    
    const categoriaSegura = { ...catEditing, backendType: catEditing.backendType || 'OUTRO' };
    if (catEditing.isNew) {
      setCategories([...categories, categoriaSegura]);
      setSelectedCategory(categoriaSegura);
    } else {
      setCategories(categories.map(c => c.id === catEditing.id ? categoriaSegura : c));
      if(selectedCategory?.id === catEditing.id) setSelectedCategory(categoriaSegura);
    }
    setModalCatVisivel(false);
  };

  const excluirCategoria = () => {
    const executeDelete = () => {
      setCategories(categories.filter(c => String(c.id) !== String(catEditing.id)));
      if (selectedCategory && String(selectedCategory.id) === String(catEditing.id)) setSelectedCategory(null);
      setModalCatVisivel(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Tem certeza que deseja excluir a categoria "${catEditing.name}"?`)) executeDelete();
    } else {
      Alert.alert("Excluir Categoria", `Tem certeza que deseja excluir "${catEditing.name}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Excluir", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      
      {/* HEADER */}
      <View style={[styles.header, isDesktop && styles.headerDesktop, { backgroundColor: colors.surface }]}>
        {selectedIds.length > 0 ? (
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelectedIds([])}><Ionicons name="close-circle" size={28} color={colors.text}/></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedIds.length} selecionados</Text>
            <TouchableOpacity onPress={excluirSelecionados}>
              <Ionicons name="trash" size={26} color={colors.danger}/>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.monthSelector} onPress={() => { setPickerAnoHeader(dataReferencia.getFullYear()); setModalMesAnoVisivel(true); }}>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{format(dataReferencia, "MMMM", { locale: ptBR })}</Text>
              <Text style={styles.yearLabel}>{format(dataReferencia, "yyyy")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.primary} style={{marginLeft: 5}} />
            </TouchableOpacity>
            <View style={styles.navArrows}>
              <TouchableOpacity onPress={() => setDataReferencia(subMonths(dataReferencia, 1))}><Ionicons name="chevron-back" size={26} color={colors.text}/></TouchableOpacity>
              <TouchableOpacity onPress={() => setDataReferencia(addMonths(dataReferencia, 1))}><Ionicons name="chevron-forward" size={26} color={colors.text}/></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {errorMessage !== "" && !modalVisivel && !modalCatVisivel && (
        <View style={[styles.errorContainer, { marginHorizontal: 20, marginTop: 15 }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* RESUMO */}
        <View style={[styles.resumoWrapper, isDesktop && styles.resumoDesktop]}>
          <View style={[styles.cardResumo, { backgroundColor: colors.surface, flex: isDesktop ? 0.4 : 1 }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <View>
                <Text style={styles.labelSaldo}>SALDO ATUAL (REALIZADO)</Text>
                <Text style={[styles.valorSaldo, { color: resumoRealizado.saldo >= 0 ? "#10b981" : "#ef4444" }]}>{currencyFormatter.format(resumoRealizado.saldo)}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                 <Text style={styles.labelSaldo}>PREVISTO (MÊS)</Text>
                 <Text style={[styles.valorSaldoPequeno, { color: '#64748b' }]}>{currencyFormatter.format(resumoPrevisto.saldo)}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statLabel}>ENTRADAS</Text><Text style={[styles.statValue, {color: "#10b981"}]}>{currencyFormatter.format(resumoRealizado.receitas)}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>SAÍDAS</Text><Text style={[styles.statValue, {color: "#ef4444"}]}>{currencyFormatter.format(resumoRealizado.despesas)}</Text></View>
            </View>
          </View>
        </View>

        {/* ABAS */}
        <View style={[styles.tabBar, isDesktop && { width: 450, alignSelf: 'center' }]}>
          <TouchableOpacity style={[styles.tabBtn, abaAtiva === "DESPESA" && { backgroundColor: "#ef4444" }]} onPress={() => setAbaAtiva("DESPESA")}>
            <Text style={[styles.tabText, abaAtiva === "DESPESA" && { color: "#fff" }]}>SAÍDAS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, abaAtiva === "RECEITA" && { backgroundColor: "#10b981" }]} onPress={() => setAbaAtiva("RECEITA")}>
            <Text style={[styles.tabText, abaAtiva === "RECEITA" && { color: "#fff" }]}>ENTRADAS</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA */}
        <View style={[styles.listContainer, isDesktop && { paddingHorizontal: 60 }]}>
{transacoesExibidas.map(item => {
    const isDone = item.status === "PAGA" || item.status === "RECEBIDA";
    const selecionado = selectedIds.includes(item.id);
    const catItem = categories.find(c => c.id === item.categoria_id) || categories.find(c => c.name === (item.tipo || item.categoria));
    
    let nomeExibir = catItem ? catItem.name : (item.tipo || item.categoria);
    if (nomeExibir === "OUTRO") nomeExibir = "Agenda"; 

    const dataCampo = item.eventDate;
    const horario = dataCampo && dataCampo.includes('T') 
      ? dataCampo.split('T')[1].substring(0, 5) 
      : "";

    const corBarra = catItem ? catItem.color : (abaAtiva === "RECEITA" ? "#10b981" : "#ef4444");

    return (
      <TouchableOpacity 
        key={item.id} 
        style={[
          styles.itemCard, 
          { backgroundColor: colors.surface }, 
          selecionado && { borderColor: colors.primary, borderWidth: 2 }
        ]}

        // Se for temporário, o clique de marcar PAGO e o longPress são ignorados silenciosamente.
        onPress={() => item.temp ? null : (selectedIds.length > 0 ? ( selecionado ? setSelectedIds(selectedIds.filter(i => i !== item.id)) : setSelectedIds([...selectedIds, item.id]) ) : toggleStatus(item))}
        onLongPress={() => item.temp ? null : setSelectedIds([...selectedIds, item.id])}
        activeOpacity={item.temp ? 1 : 0.7} 
      >
        <View style={[styles.indicator, { backgroundColor: corBarra }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: colors.text }, isDone && { opacity: 0.5 }]} numberOfLines={1}>
            {item.descricao}
          </Text>
          
        <Text style={styles.itemSub}>
              <Text style={{ fontWeight: 'bold' }}>{nomeExibir}</Text> • 
              Agendado: {safeFormatDate(item.eventDate)}
          
              {/* Só renderiza se a string existir */}
              {horario ? ` às ${horario}` : ""}

              {item.paidAt && (
        <Text style={{ color: '#10b981' }}> • Pago: {safeFormatDate(item.paidAt)}</Text>
          )}
        </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.itemVal, { color: abaAtiva === "RECEITA" ? "#10b981" : "#ef4444", opacity: isDone ? 1 : 0.6 }]}>
            {currencyFormatter.format(item.valor)}
          </Text>
          {!isDone && <Text style={styles.tagPendente}>Pendente</Text>}
          
          <View style={styles.cardActions}>
              {/*O clique no lápis é neutralizado se o ID for temporário */}
              <TouchableOpacity 
                onPress={() => item.temp ? null : abrirModalEditar(item)} 
                hitSlop={{top:10,bottom:10,left:10,right:10}}
                activeOpacity={item.temp ? 1 : 0.2}
              >
                 <Ionicons name="pencil" size={18} color="#94a3b8" />
              </TouchableOpacity>
              
              {/* A lixeira NÃO recebe a trava `item.temp ? null`, pois ela é a única que engatilha a exclusão assíncrona do useRef */}
              <TouchableOpacity 
                onPress={() => excluirItemRapido(item)} 
                hitSlop={{top:10,bottom:10,left:10,right:10}}
              >
                 <Ionicons name="trash-outline" size={18} color="#ef4444"/>
              </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
})}
          {transacoesExibidas.length === 0 && <Text style={styles.emptyText}>Nenhum lançamento neste mês.</Text>}
        </View>
      </ScrollView>

      {/* FAB */}
      {selectedIds.length === 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: abaAtiva === "RECEITA" ? "#10b981" : "#ef4444" }]} onPress={abrirModalNovo}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* MODAL PICKER MÊS/ANO  */}
      <Modal visible={modalMesAnoVisivel} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={[styles.pickerBox, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerAnoHeader(pickerAnoHeader - 1)}><Ionicons name="chevron-back" size={24} color={colors.text}/></TouchableOpacity>
              <Text style={[styles.pickerYear, { color: colors.text }]}>{pickerAnoHeader}</Text>
              <TouchableOpacity onPress={() => setPickerAnoHeader(pickerAnoHeader + 1)}><Ionicons name="chevron-forward" size={24} color={colors.text}/></TouchableOpacity>
            </View>
            <View style={styles.mesesGrid}>
              {MESES_CURTOS.map((m, i) => (
                <TouchableOpacity key={m} style={styles.mesBtn} onPress={() => { setDataReferencia(setMonth(setYear(new Date(), pickerAnoHeader), i)); setModalMesAnoVisivel(false); }}>
                  <Text style={{ fontWeight: 'bold', color: colors.text }}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULÁRIO (ADD/EDIT) */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlayBottom}>
          <View style={[styles.modalSaaS, { backgroundColor: colors.surface, width: isDesktop ? 600 : '100%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalSaaSTitle, {color: colors.text}]}>{transacaoEditando ? "Editar" : "Novo"} Lançamento</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close" size={28} color={colors.text}/></TouchableOpacity>
            </View>

            {errorMessage !== "" && (
              <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.label}>TÍTULO</Text>
              <TextInput style={[styles.inputSaaS, {color: colors.text, backgroundColor: colors.inputBackground}]} value={descricao} onChangeText={setDescricao} placeholder="Ex: Mensalidade Academia" placeholderTextColor="#999" />
              
              <Text style={styles.label}>DESCRIÇÃO / OBSERVAÇÕES (Opcional)</Text>
              <TextInput 
                style={[styles.inputSaaS, {color: colors.text, backgroundColor: colors.inputBackground, height: 60, paddingTop: 12}]} 
                value={observacao} 
                onChangeText={setObservacao} 
                multiline
                placeholder="Detalhes adicionais..." 
                placeholderTextColor="#999" 
              />

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>VALOR R$</Text>
                  <TextInput 
                     style={[styles.inputSaaS, {color: colors.text, backgroundColor: colors.inputBackground, fontWeight: 'bold'}]} 
                     value={valor} 
                     onChangeText={handleMoneyMask} 
                     keyboardType="numeric" 
                     placeholder="0,00" 
                     placeholderTextColor="#999" 
                  />
                </View>
              </View>

              {/* DATA INLINE */}
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.label}>DATA</Text>
                <TouchableOpacity 
                  onPress={() => setShowInlineDatePicker(!showInlineDatePicker)} 
                  style={[styles.inputSaaS, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBackground }]}
                >
                   <Text style={{fontSize: 16, color: colors.text}}>{format(dataSelecionadaForm, "dd/MM/yyyy")}</Text>
                   <Ionicons name={showInlineDatePicker ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {showInlineDatePicker && (
                  <View style={[styles.inlinePickerContainer, {backgroundColor: colors.surface}]}>
                    <ScrollView style={styles.pickerCol} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                       {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                         <TouchableOpacity key={d} onPress={() => setDataSelecionadaForm(new Date(getYear(dataSelecionadaForm), getMonth(dataSelecionadaForm), d))} 
                           style={[styles.pickerCell, getDate(dataSelecionadaForm) === d && {backgroundColor: colors.primary + '20'}]}>
                            <Text style={[styles.pickerText, getDate(dataSelecionadaForm) === d && {color: colors.primary, fontWeight:'bold'}]}>{d}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                    <ScrollView style={styles.pickerCol} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                       {MESES_CURTOS.map((m, i) => (
                         <TouchableOpacity key={m} onPress={() => setDataSelecionadaForm(setMonth(dataSelecionadaForm, i))} 
                           style={[styles.pickerCell, getMonth(dataSelecionadaForm) === i && {backgroundColor: colors.primary + '20'}]}>
                            <Text style={[styles.pickerText, getMonth(dataSelecionadaForm) === i && {color: colors.primary, fontWeight:'bold'}]}>{m}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                    <ScrollView style={styles.pickerCol} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                       {Array.from({length: 10}, (_, i) => getYear(new Date()) - 5 + i).map(y => (
                         <TouchableOpacity key={y} onPress={() => setDataSelecionadaForm(setYear(dataSelecionadaForm, y))} 
                           style={[styles.pickerCell, getYear(dataSelecionadaForm) === y && {backgroundColor: colors.primary + '20'}]}>
                            <Text style={[styles.pickerText, getYear(dataSelecionadaForm) === y && {color: colors.primary, fontWeight:'bold'}]}>{y}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.rowBetween}>
                  <Text style={styles.label}>CATEGORIA</Text>
                  <TouchableOpacity onPress={abrirNovaCategoria} style={{padding: 5}}>
                    <Text style={[styles.linkAction, {color: colors.primary}]}>+ Gerenciar</Text>
                  </TouchableOpacity>
              </View>
              
              <View style={styles.chipsRow}>
                {categories.filter(c => c.type === abaAtiva).map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    onPress={() => setSelectedCategory(cat)} 
                    onLongPress={() => abrirEditarCategoria(cat)}
                    delayLongPress={600} 
                    activeOpacity={0.7}
                    style={[styles.chipItem, selectedCategory?.id === cat.id && { backgroundColor: cat.color }]}
                  >
                    <Text style={[styles.chipText, selectedCategory?.id === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>* Segure em uma categoria para editar/excluir</Text>

              <View style={styles.actionButtonsContainer}>
                {transacaoEditando && (
                   <TouchableOpacity style={styles.btnDelete} onPress={excluirTransacaoAtual}>
                     <Ionicons name="trash-outline" size={24} color="#ef4444" />
                   </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.btnConfirm, { backgroundColor: abaAtiva === "RECEITA" ? "#10b981" : "#ef4444" }]} 
                  onPress={salvarTransacao}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>CONFIRMAR</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL GERENCIAR CATEGORIA */}
      <Modal visible={modalCatVisivel} transparent animationType="fade" onRequestClose={() => setModalCatVisivel(false)}>
        <View style={styles.overlayCenter}>
          <View style={[styles.modalCatContent, {backgroundColor: colors.surface}]}>
            <Text style={[styles.modalCatTitle, {color: colors.text}]}>{catEditing?.isNew ? "Criar Categoria" : "Editar Categoria"}</Text>
            
            {errorMessage !== "" && (
              <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Text style={styles.label}>NOME DA CATEGORIA</Text>
            <TextInput 
              style={[styles.inputSaaS, {backgroundColor: colors.inputBackground, color: colors.text}]} 
              value={catEditing?.name || ''} 
              onChangeText={t => setCatEditing(prev => ({...prev, name: t}))}
              placeholder="Ex: Alimentação"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>COR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setCatEditing(prev => ({...prev, color: c}))} style={[styles.colorCircle, { backgroundColor: c }, catEditing?.color === c && styles.colorSelected]} />
              ))}
            </View>

            <View style={styles.rowBetween}>
              {!catEditing?.isNew && (
                <TouchableOpacity onPress={excluirCategoria} style={styles.btnDeleteCat}>
                   <Text style={{color: colors.danger, fontWeight:'bold'}}>Excluir</Text>
                </TouchableOpacity>
              )}
              <View style={{flexDirection: 'row', gap: 10, flex: 1, justifyContent: 'flex-end'}}>
                <TouchableOpacity onPress={() => {setModalCatVisivel(false); setErrorMessage("");}} style={styles.btnCancelCat}>
                   <Text style={{fontWeight:'bold', color: colors.textSecondary}}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={salvarCategoria} style={[styles.btnSaveCat, {backgroundColor: colors.primary}]}>
                   <Text style={{color: '#fff', fontWeight:'bold'}}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, elevation: 4 },
  headerDesktop: { paddingHorizontal: 60, borderBottomWidth: 1, borderColor: '#eee' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  monthLabel: { fontSize: 24, fontWeight: '900', textTransform: 'capitalize' },
  yearLabel: { fontSize: 24, fontWeight: '300', marginLeft: 5 },
  navArrows: { flexDirection: 'row', gap: 15 },
  resumoWrapper: { padding: 20 },
  resumoDesktop: { paddingHorizontal: 60, marginTop: 10 },
  cardResumo: { padding: 25, borderRadius: 28, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  labelSaldo: { fontSize: 13, color: '#aaa', fontWeight: '700', marginBottom: 5 },
  valorSaldo: { fontSize: 32, fontWeight: '800', marginBottom: 5 },
  valorSaldoPequeno: { fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#f1f1f1', paddingTop: 15, marginTop: 10 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#aaa', fontWeight: 'bold', marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: '#f5f5f5', margin: 20, borderRadius: 18, padding: 5 },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  tabText: { fontSize: 12, fontWeight: '900', color: '#666' },
  listContainer: { paddingHorizontal: 20 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 12, elevation: 2 },
  indicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  itemTitle: { fontSize: 17, fontWeight: '700' },
  itemSub: { fontSize: 13, color: '#94a3b8', marginTop: 3 },
  itemVal: { fontSize: 18, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#cbd5e1', marginTop: 40, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { width: '85%', borderRadius: 30, padding: 30, alignItems: 'center' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 25 },
  pickerYear: { fontSize: 26, fontWeight: '800' },
  mesesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  mesBtn: { width: '30%', paddingVertical: 15, backgroundColor: '#f8fafc', borderRadius: 15, alignItems: 'center' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSaaS: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  modalSaaSTitle: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginTop: 15, marginBottom: 8 },
  inputSaaS: { padding: 16, borderRadius: 18, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 5 },
  chipItem: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  cardActions: { flexDirection: 'row', gap: 15, marginTop: 8, justifyContent: 'flex-end' },
  actionButtonsContainer: { flexDirection: 'row', gap: 12, marginTop: 25, alignItems: 'center' },
  btnDelete: { backgroundColor: '#fee2e2', padding: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca', width: 60 },
  btnConfirm: { flex: 1, padding: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tagPendente: { fontSize: 10, color: '#f59e0b', fontWeight: 'bold', backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  inlinePickerContainer: { flexDirection: 'row', height: 130, gap: 8, marginBottom: 15, padding: 8, borderRadius: 16 },
  pickerCol: { flex: 1, backgroundColor: '#fff', borderRadius: 12 },
  pickerCell: { paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  pickerText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  modalCatContent: { borderRadius: 25, padding: 25, width: 320 },
  modalCatTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  colorGrid: { flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: '#000' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  btnDeleteCat: { padding: 10 },
  btnCancelCat: { padding: 10, marginRight: 10 },
  btnSaveCat: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  linkAction: { fontWeight: 'bold', fontSize: 12 },
  hintText: { fontSize: 10, color: '#ccc', fontStyle: 'italic', marginBottom: 15 },
  
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