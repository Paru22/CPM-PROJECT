import { Ionicons } from "@expo/vector-icons";
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
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function LoginPage() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ImageBackground
      source={require("../assets/images/clg.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Gradient Overlay */}
      <LinearGradient
        colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.9)"]}
        style={styles.overlay}
      />

      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* College Name */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>
            GP Ambota
          </Text>
          <Text style={[styles.subtitle, { color: colors.textDark }]}>
            College Project Management
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Student Login */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => router.push("/Login/studentlogin")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="school-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Student Login</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Teacher Login */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => router.push("/Login/teacherlogin")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Teacher Login</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            CPM Project v1.0
          </Text>
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  logo: {
    width: width * 0.7,
    height: width * 0.22,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    gap: 15,
  },
  buttonWrapper: {
    width: width * 0.85,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 16,
    gap: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
  },
});