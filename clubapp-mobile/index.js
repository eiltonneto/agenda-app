import { registerRootComponent } from 'expo';

import App from './App'; // Importa o seu arquivo App.js que deve estar na mesma pasta (Raiz)

// registerRootComponent chama AppRegistry.registerComponent('main', () => App);
// Isso garante que o ambiente seja configurado corretamente, seja no Expo Go ou na build nativa.
registerRootComponent(App);