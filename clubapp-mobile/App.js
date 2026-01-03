import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import AgendaScreen from "./src/screens/AgendaScreen";
import FinanceiroScreen from "./src/screens/FinanceiroScreen";
import NotificacoesScreen from "./src/screens/NotificacoesScreen";



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let icon;

          if (route.name === "Agenda") icon = "calendar";
          if (route.name === "Financeiro") icon = "cash";
          if (route.name === "Notificações") icon = "notifications";

          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} />
      <Tab.Screen name="Notificações" component={NotificacoesScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { token } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />

        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
