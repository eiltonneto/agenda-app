import React, { createContext, useState, useContext } from 'react';

// --- DEFINIÇÃO DAS CORES (PALETA SKY ENERGY) ---
const themes = {
  light: {
    isDark: false,
    colors: {
      primary: '#0ea5e9',       // Azul Sky (Principal)
      background: '#f0f9ff',    // Fundo bem clarinho (Alice Blue)
      surface: '#ffffff',       // Branco (Cartões e Modais)
      text: '#0f172a',          // Texto Principal (Escuro)
      textSecondary: '#64748b', // Texto Secundário (Cinza Azulado)
      border: '#e2e8f0',        // Bordas sutis
      inputBackground: '#f8fafc', // Fundo dos Inputs
      
      success: '#10b981',       // Verde (Receitas/Sucesso)
      danger: '#ef4444',        // Vermelho (Despesas/Erro)
      warning: '#f59e0b',       // Laranja (Avisos)
    }
  },
  dark: {
    isDark: true,
    colors: {
      primary: '#38bdf8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      inputBackground: '#334155',
      
      success: '#34d399',
      danger: '#f87171',
      warning: '#fbbf24',
    }
  }
};

// Criação do Contexto
const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  // Começa com o tema claro (light)
  const [theme, setTheme] = useState(themes.light);// inicia o estado do tema com o tema claro (light) como padrão. O useState é um hook do React que permite adicionar estado a componentes funcionais. Aqui, theme é o estado atual do tema, e setTheme é a função que permite atualizar esse estado.

  function toggleTheme() {
    setTheme(theme.isDark ? themes.light : themes.dark); // if/else moderno que alterna entre os temas claro e escuro. Se o tema atual for escuro (theme.isDark for true), ele muda para o tema claro (themes.light). Caso contrário, ele muda para o tema escuro (themes.dark). Isso permite que o usuário alterne facilmente entre os dois temas.
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personalizado para usar o tema
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}

// --- IMPORTANTE: EXPORT DEFAULT PARA EVITAR ERROS NO APP.JS ---
export default ThemeProvider;