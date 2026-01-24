import { colors } from '@/constants/colors';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TextStyle, View } from 'react-native';

interface RainbowTextProps {
  children: string;
  style?: TextStyle;
}

const numColors = colors.rainbow.length;

export function RainbowText({ children, style }: RainbowTextProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use linear easing for smooth continuous animation
    const animate = () => {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: numColors,
        duration: numColors * 400,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          animate(); // Seamlessly restart
        }
      });
    };
    animate();

    return () => animatedValue.stopAnimation();
  }, [animatedValue]);

  const characters = children.split('');

  // Build input range: [0, 1, 2, ..., numColors]
  const inputRange = Array.from({ length: numColors + 1 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {characters.map((char, index) => {
        // Spread the rainbow across twice the text length (half spectrum visible)
        const colorOffset = Math.floor((index / (characters.length * 2)) * numColors);

        // Create rotated color array with seamless wrap (first color repeated at end)
        const outputRange = Array.from({ length: numColors + 1 }, (_, i) =>
          colors.rainbow[(i + colorOffset) % numColors]
        );

        const charColor = animatedValue.interpolate({
          inputRange,
          outputRange,
        });

        return (
          <Animated.Text
            key={`${char}-${index}`}
            style={[style, { color: charColor }]}
          >
            {char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
