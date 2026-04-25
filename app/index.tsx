import { useRouter } from "expo-router";
import {
  Dimensions,
  Image,
  ImageBackground,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function LoginPage() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <ImageBackground
      source={require("../assets/images/clg.jpg")}
      style={styles.background}
      resizeMode="cover"
      blurRadius={2}
    >
      <View 
        style={[
          styles.overlay,
          { backgroundColor: isDarkMode ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.4)" }
        ]} 
      />

      <View style={styles.container}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[styles.title, { color: colors.primary }]}>
          Gp Ambota
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/Login/studentlogin")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Student Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/Login/teacherlogin")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Teacher Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute" as const,  // Fixed: proper literal type
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    justifyContent: "center" as const,  // Fixed: proper literal type
    alignItems: "center" as const,       // Fixed: proper literal type
    paddingHorizontal: 20,
  },
  logo: {
    width: width * 0.9,
    height: width * 0.25,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "700" as const,  // Fixed: proper literal type
    marginBottom: 50,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center" as const,  // Fixed: proper literal type
  },
  button: {
    width: width * 0.8,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center" as const,  // Fixed: proper literal type
    marginVertical: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600" as const,  // Fixed: proper literal type
  },
});