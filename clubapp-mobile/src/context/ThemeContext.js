import React, { createContext, useState, useContext } from "react";
// import { useColorScheme } from "react-native"; // Não vamos mais usar a detecção automática

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // ANTES: const deviceTheme = useColorScheme();
  // ANTES: const [isDark, setIsDark] = useState(deviceTheme === "dark");
  
  // AGORA: Iniciamos sempre como false (Modo Claro/Normal)
  const [isDark, setIsDark] = useState(false);

  // --- PALETA DE CORES CLUBFLOW ---
  const theme = {
    isDark,
    colors: isDark ? {
      // --- TEMA ESCURO (Dark Teal) ---
      background: '#001F1F', 
      surface: '#003333',    
      text: '#E0F2F1',       
      textSecondary: '#80CBC4', 
      primary: '#4DB6AC',    
      border: '#004D4D',     
      inputBackground: '#002626',
      danger: '#FF6B6B',     
      success: '#26A69A'     
    } : {
      // --- TEMA CLARO (Light Teal - Padrão Inicial) ---
      background: '#F0F8FF', // Fundo claro
      surface: '#FFFFFF',    // Cartões brancos
      text: '#004D4D',       // Texto escuro (Verde Petróleo)
      textSecondary: '#5F7D7D', 
      primary: '#008080',    // Teal Oficial
      border: '#B2DFDB',     
      inputBackground: '#F5F5F5',
      danger: '#E74C3C',
      success: '#2ECC71'
    }
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);