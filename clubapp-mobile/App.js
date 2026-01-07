import React from "react";
import { Image, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { registerForPushNotificationsAsync } from "./src/services/NotificationService";

// Contexts
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { API_URL } from "./src/services/api";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import EsqueciSenhaScreen from "./src/screens/EsqueciSenhaScreen"; // <--- 1. IMPORTAR AQUI
import AgendaScreen from "./src/screens/AgendaScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import NotificacoesScreen from "./src/screens/NotificacoesScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import ConfiguracoesScreen from "./src/screens/ConfiguracoesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ... (Mantenha a função AppTabs igualzinha) ...
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
          if (route.name === "Perfil" && user?.foto) {
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

function RootNavigator() {
  const { token } = useAuth();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      {!token ? (
        // --- TELAS DE NÃO-LOGADO (AUTH) ---
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Cadastro" component={RegisterScreen} />
          {/* 2. ADICIONAR ESTA LINHA 👇 */}
          <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
        </Stack.Group>
      ) : (
        // --- TELAS DE LOGADO (APP) ---
        <Stack.Group>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider> 
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
  return (
    <AuthProvider>
      <ThemeProvider> 
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}