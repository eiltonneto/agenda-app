import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { addWeeks, addMonths } from 'date-fns';

// 1. Configuração Global
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Pedir Permissão
export async function registerForPushNotificationsAsync() {
  // Se for Web, não faz nada (ou apenas loga)
  if (Platform.OS === 'web') {
    console.log("⚠️ Notificações Push não são suportadas nativamente na Web neste modo.");
    return;
  }

  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Falha', 'Sem permissão para notificações!');
      return;
    }
  } else {
    console.log('Use um dispositivo físico para notificações Push.');
  }
  return token;
}

// 3. Agendar por DATA (Blindada para Web)
export async function agendarLembreteData(titulo, dataDisparo) {
  const trigger = new Date(dataDisparo);
  const agora = new Date();

  console.log("--- TENTANDO AGENDAR ---");
  console.log("Agora:", agora.toLocaleTimeString());
  console.log("Para:", trigger.toLocaleTimeString());

  if (trigger <= agora) {
    console.log("❌ Data já passou.");
    return;
  }

  // --- TRAVA DE SEGURANÇA PARA WEB ---
  if (Platform.OS === 'web') {
    console.log(`💻 [MODO WEB] Notificação simulada: "${titulo}" agendada para ${trigger.toLocaleTimeString()}`);
    alert(`[Simulação Web] Lembrete agendado: ${titulo}`);
    return; // Para aqui e não tenta chamar o código nativo
  }

  // Código Nativo (Android/iOS)
  try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "📅 Lembrete ClubFlow",
          body: titulo,
          sound: true,
        },
        trigger: { date: trigger },
      });
      console.log("✅ Agendado no celular! ID:", id);
  } catch (e) {
      console.log("❌ Erro ao agendar:", e);
  }
}