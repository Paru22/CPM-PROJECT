import { Stack, useRouter, useSegments } from "expo-router";
import { Platform, ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

// Auth guard component to handle redirects
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "Login";

    if (!user && !inAuthGroup) {
      router.replace("/Login");
    } else if (user && inAuthGroup) {
      if (user.role === "student") {
        router.replace("/Tabs/Studentdashboard/studentdashboard");
      } else {
        router.replace("/Tabs/Teacherdashboard/Teacherdashboard");
      }
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
              contentStyle: { backgroundColor: "#fff" },
            }}
          >
            <Stack.Screen 
              name="index" 
              options={{ animation: "fade" }} 
            />
            <Stack.Screen 
              name="Login" 
              options={{ animation: "fade" }} 
            />
            <Stack.Screen 
              name="Tabs" 
              options={{ gestureEnabled: false }} 
            />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}