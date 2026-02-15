import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TextStyle, View } from 'react-native';

interface RainbowTextProps {
  children: string;
  style?: TextStyle;
}

// Website gradient colors
const COLORS = ['#6666ff', '#0099ff', '#00ff00', '#ff3399'];

// Interpolate between two hex colors
function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get color at position 0-1 along the gradient
function getGradientColor(pos: number): string {
  const p = ((pos % 1) + 1) % 1; // Normalize to 0-1
  const scaledPos = p * COLORS.length;
  const i = Math.floor(scaledPos);
  const t = scaledPos - i;
  return lerpColor(COLORS[i % COLORS.length], COLORS[(i + 1) % COLORS.length], t);
}

export function RainbowText({ children, style }: RainbowTextProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 6000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) animate();
      });
    };
    animate();
    return () => animatedValue.stopAnimation();
  }, [animatedValue]);

  const characters = children.split('');
  const words = children.split(/(\s+)/); // Split keeping whitespace as separate entries
  const steps = 30;
  const inputRange = Array.from({ length: steps + 1 }, (_, i) => i / steps);

  let charIndex = 0;
  return (
    <View style={styles.container}>
      {words.map((word, wordIndex) => (
        <View key={wordIndex} style={styles.word}>
          {word.split('').map((char) => {
            const index = charIndex++;
            const charPhase = (index / characters.length) * 0.25;
            const outputRange = inputRange.map((t) => getGradientColor(charPhase + t));
            const charColor = animatedValue.interpolate({ inputRange, outputRange });

            return (
              <Animated.Text key={`${char}-${index}`} style={[style, { color: charColor }]}>
                {char}
              </Animated.Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    flexDirection: 'row',
  },
});
