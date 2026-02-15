import { colors } from "@/constants/colors";
import { microknightText } from "@/constants/typography";
import { Image, StyleSheet, Text, View } from "react-native";

interface AppLoadingScreenProps {
  message?: string;
}

export function AppLoadingScreen({ message }: AppLoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SYNTAX ERROR</Text>
        <Text style={styles.subtitle}>Loading</Text>
        <Image
          source={require("@/assets/images/invader-dance.gif")}
          style={styles.spinner}
          resizeMode="contain"
        />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    ...microknightText["3xl"],
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: "freepixel",
    fontSize: 14,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 48,
  },
  spinner: {
    width: 96,
    height: 96,
    marginBottom: 24,
  },
  message: {
    fontFamily: "freepixel",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
