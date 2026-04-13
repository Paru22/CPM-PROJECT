import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LightColors as colors } from "../assets/images/colors"; // adjust path if needed

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: "#fff",
      }}
    >
      <Tabs.Screen
        name="Teacherdashboard"
        options={{
          title: "Teacher",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Studentdashboard"
        options={{
          title: "Student",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}