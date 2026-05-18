import { Stack, useRouter, useSegments } from "expo-router";
import { Platform, ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const segmentPath = segments.join("/");
    console.log("AuthGuard - Path:", segmentPath, "User:", user?.role);

    // Allow home page and login pages without redirect
    if (segmentPath === "" || segmentPath === "index" || segments[0] === "Login") {
      return;
    }

    // If not logged in and trying to access protected pages
    if (!user) {
      router.replace("/Login/teacherlogin");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
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
            <Stack.Screen name="index" />
            <Stack.Screen name="Login" />
            <Stack.Screen name="Tabs" options={{ gestureEnabled: false }} />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}