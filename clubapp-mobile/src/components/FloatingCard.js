import { View, StyleSheet } from 'react-native';

export default function FloatingCard({ children }) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  }
});
