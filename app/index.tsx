import { useRouter } from "expo-router";
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function LoginPage() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ImageBackground
      source={require("../assets/images/clg.jpg")}
      style={styles.background}
      resizeMode="cover"
      blurRadius={1.5}
    >
      <View style={styles.overlay} />

      <View style={styles.container}>
        <Image
          source={require("../assets/images/logo.png")}
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
          >
            <Text style={styles.buttonText}>Student Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/Login/teacherlogin")}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: width * 0.9,
    height: width * 0.25,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 50,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: width * 0.8,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
    elevation: 5,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});