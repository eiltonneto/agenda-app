import React from "react";
import { View, Text, ActivityIndicator, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// --- CONTEXTOS ---
import AuthProvider, { useAuth } from "./src/context/AuthContext";
import ThemeProvider, { useTheme } from "./src/context/ThemeContext";

// --- TELAS ---
import AuthScreen from "./src/screens/AuthScreen";
import AgendaScreen from "./src/screens/AgendaScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import PerfilScreen from "./src/screens/PerfilScreen"; 
import ConfiguracoesScreen from "./src/screens/ConfiguracoesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- NAVEGAÇÃO DE ABAS (LOGADO) ---
function AppTabs() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 85,           // 👈 Ajustado para respiro total em dispositivos modernos
          paddingBottom: 20,    // 👈 Garante que o texto não corte em Fortaleza/CE
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarLabelStyle: { 
          fontSize: 10,         // 👈 Tamanho ideal para evitar quebra de linha
          fontWeight: '700',
          marginTop: -5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Agenda') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Financeiro') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Notificações') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }
          return <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} />
      {/* Dica: Quando criar a tela de Notificações, basta substituir o Placeholder. 
          Por enquanto, deixaremos a Agenda e Financeiro como foco do seu MVP.
      */}
      <Tab.Screen name="Perfil" component={PerfilScreen} /> 
    </Tab.Navigator>
  );
}

// --- ROTEAMENTO PRINCIPAL ---
function AppRoutes() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Se NÃO tem usuário -> Fluxo de Autenticação
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        // Se TEM usuário -> Fluxo Interno Protegido
        <>
          <Stack.Screen name="Home" component={AppTabs} />
          <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
          {/* Adicione outras telas internas aqui (ex: Detalhes do Evento) */}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          {/* O translucent ajuda a cor do LinearGradient do AuthScreen a subir até o topo */}
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <AppRoutes />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}