import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

// Contextos
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { API_URL } from "./services/api";

// --- TELAS ---
// Autenticação
import AuthScreen from "./screens/AuthScreen";
import EsqueciSenhaScreen from "./screens/EsqueciSenhaScreen";

// App (Logado)
import AgendaScreen from "./screens/AgendaScreen";
import FinanceiroScreen from "./screens/FinanceiroScreen";
import NotificacoesScreen from "./screens/NotificacoesScreen";
import PerfilScreen from "./screens/PerfilScreen";
import ConfiguracoesScreen from "./screens/ConfiguracoesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. CONFIGURAÇÃO DAS ABAS (MANTIDA DO SEU CÓDIGO) ---
function AppTabs() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
            paddingBottom: 5, 
            height: 60, 
            backgroundColor: colors.surface, 
            borderTopColor: colors.border 
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          // Lógica da foto do perfil nas abas
          if (route.name === "Perfil" && user?.foto) {
             // Se tiver foto, mostra ela (com borda se focado)
             const imageUrl = `${API_URL}/uploads/${user.foto}`;
             return (
               <View style={{ padding: 2, borderWidth: focused ? 2 : 0, borderColor: color, borderRadius: 15 }}>
                 <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
               </View>
             );
          }
          
          let iconName;
          if (route.name === "Agenda") iconName = "calendar";
          else if (route.name === "Financeiro") iconName = "cash";
          else if (route.name === "Notificações") iconName = "notifications";
          else if (route.name === "Perfil") iconName = "person";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} />
      <Tab.Screen name="Notificações" component={NotificacoesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

// --- 2. O GUARDA DE TRÂNSITO (LÓGICA PRINCIPAL) ---
export default function Routes() {
  const { signed, loading } = useAuth(); // Pega o estado do AuthContext
  const { theme } = useTheme();

  // Se estiver carregando o Storage, mostra rodinha
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      
      {signed ? (
        // === ROTAS DE USUÁRIO LOGADO ===
        <Stack.Group>
          {/* A tela principal agora são as Abas */}
          <Stack.Screen name="AppTabs" component={AppTabs} />
          {/* Telas extras que não estão na aba (ex: Configurações) entram aqui */}
          <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
        </Stack.Group>

      ) : (
        // === ROTAS DE LOGIN (NÃO LOGADO) ===
        <Stack.Group>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
        </Stack.Group>
      )}

    </Stack.Navigator>
  );
}