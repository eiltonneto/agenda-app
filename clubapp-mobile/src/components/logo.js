// src/components/Logo.js
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Polygon } from 'react-native-svg';

export const Logo = ({ width = 120, height = 120 }) => {
  return (
    // Removi qualquer style extra aqui para garantir pureza
    <Svg width={width} height={height} viewBox="0 0 32 32" fill="none">
      <Defs>
        <LinearGradient id="a" x1="-67.907" y1="-308.551" x2="-67.857" y2="-308.564" gradientTransform="matrix(87.822 0 0 -88.533 5984.532 -27290.617)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffb047" />
        </LinearGradient>
        <LinearGradient id="b" x1="-67.674" y1="-310.121" x2="-67.647" y2="-310.063" gradientTransform="matrix(87.822 0 0 -88.533 5964.667 -27443)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd754" />
          <Stop offset="1" stopColor="#ffb532" />
        </LinearGradient>
        <LinearGradient id="c" x1="-67.029" y1="-310.91" x2="-67.029" y2="-310.86" gradientTransform="matrix(87.822 0 0 -88.533 5902.8 -27518.733)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd642" />
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffb532" />
        </LinearGradient>
        <LinearGradient id="d" x1="-66.252" y1="-310.377" x2="-66.32" y2="-310.362" gradientTransform="matrix(106.198 0 0 -88.551 7048.428 -27474.167)" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd441" />
          <Stop offset="1" stopColor="#ffa829" />
        </LinearGradient>
      </Defs>
      
      <Path d="M23.426 29.41V22.172h-7.18l7.18 7.238" fill="#ffdf51" fillOpacity="0.7" />
      <Path d="M24.231 25.306V17.477H16.466l7.766 7.829" fill="#ff8900" fillOpacity="0.7" />
      <Path d="M19.515 22.171V30h7.766l-7.766-7.829" fill="url(#a)" fillOpacity="0.7" />
      <Path d="M22.608 18V11.809H16.466L22.608 18" fill="#ffdf4f" fillOpacity="0.7" />
      <Path d="M25.524 16.525V8.7H17.759l7.766 7.829" fill="url(#b)" fillOpacity="0.8" />
      <Path d="M12.288 2V9.829h7.766L12.288 2" fill="url(#c)" fillOpacity="0.8" />
      <Path d="M14.11 14.262V6.433H4.719l7.732 7.83 1.659 0" fill="url(#d)" fillOpacity="0.88" />
      <Path d="M14.11 29.958V20.487H4.719l9.391 9.471" fill="#ffb700" fillOpacity="0.7" />
      <Path d="M14.112 22.114V14.285H6.346l7.766 7.829" fill="#ffb700" fillOpacity="0.5" />
      <Path d="M16.465 11.809v7.829h7.766l-7.766-7.829" fill="#ffcd25" fillOpacity="0.7" />
      <Path d="M14.092 12.691V4.862H6.326l7.766 7.829" fill="#ff8900" fillOpacity="0.7" />
      <Path d="M16.246 22.171V30h7.766l-7.766-7.829" fill="#ff8900" fillOpacity="0.7" />
      <Polygon points="21.122 22.172 18.609 19.638 16.465 19.638 16.466 11.809 20.847 11.809 18.882 9.829 14.092 9.829 14.11 14.262 14.11 20.487 14.11 30 16.246 30 16.246 22.172 21.122 22.172" fill="#fff" />
    </Svg>
  );
};