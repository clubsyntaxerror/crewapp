import { colors } from "@/constants/colors";
import { LoadingStep } from "@/contexts/AuthContext";
import { microknightText } from "@/constants/typography";
import { Image, StyleSheet, Text, View } from "react-native";

interface AppLoadingScreenProps {
  steps?: LoadingStep[];
}

export function AppLoadingScreen({ steps = [] }: AppLoadingScreenProps) {
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
        {steps.length > 0 && (
          <View style={styles.stepList}>
            {steps.map((step) => (
              <Text
                key={step.label}
                style={[styles.step, step.completed && styles.stepCompleted]}
              >
                {step.completed ? "> " : "  "}{step.label}
              </Text>
            ))}
          </View>
        )}
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
  stepList: {
    alignItems: "flex-start",
    gap: 6,
  },
  step: {
    fontFamily: "freepixel",
    fontSize: 14,
    color: colors.textTertiary,
  },
  stepCompleted: {
    color: colors.success,
  },
});
