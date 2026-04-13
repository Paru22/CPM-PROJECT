import { Stack } from "expo-router";
import { Platform } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "horizontal",
            animation: Platform.select({
              ios: "slide_from_right",
              android: "slide_from_right",
            }),
            presentation: "card",
          }}
        >
          {/* Screens */}
          <Stack.Screen name="index" />
          <Stack.Screen name="Login" />
          <Stack.Screen name="Tabs" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}