import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Linking,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../../context/ThemeContext";

interface FacultyItem {
  id: string;
  name: string;
  role: string;
  contact: string;
}

const placeholderFacultyData: FacultyItem[] = [
  { id: "1", name: "Dr Rajesh Sharma", role: "HOD Computer Department", contact: "+1234567890" },
  { id: "2", name: "Miss Pooja Thakur", role: "Teacher", contact: "+1234567891" },
  { id: "3", name: "Mr Ashish Kalia", role: "Teacher", contact: "+1234567892" },
  { id: "4", name: "Miss Shilpa", role: "Teacher", contact: "+1234567893" },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [facultyData, setFacultyData] = useState<FacultyItem[]>([]);

  // Animation for the whole container
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    setFacultyData(placeholderFacultyData);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]); // fixed missing dependencies

  const makeCall = async (number: string) => {
    const url = `tel:${number}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Error", "Calling not supported on this device");
    }
  };

  const openWhatsApp = async (number: string) => {
    const url = `https://wa.me/${number.replace("+", "")}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Error", "WhatsApp not installed");
    }
  };

  const renderItem = ({ item }: { item: FacultyItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, boxShadow: "0px 2px 5px rgba(0,0,0,0.1)" }]}>
      <Text style={[styles.name, { color: colors.textDark }]}>{item.name}</Text>
      <Text style={[styles.role, { color: colors.textLight }]}>{item.role}</Text>
      <Text style={[styles.contact, { color: colors.primary }]}>{item.contact}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.callBtn} onPress={() => makeCall(item.contact)}>
          <Text style={styles.btnText}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappBtn} onPress={() => openWhatsApp(item.contact)}>
          <Text style={styles.btnText}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const callSupport = () => {
    makeCall("+1234567899");
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={[styles.title, { color: colors.textDark }]}>📞 Help & Support</Text>

        <FlatList
          data={facultyData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        />

        {/* Call Support Floating Button */}
        <TouchableOpacity
          style={[
            styles.supportBtn,
            {
              backgroundColor: colors.primary,
              boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
            },
          ]}
          onPress={callSupport}
        >
          <Text style={styles.supportText}>📲 Call Support</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.secondary,
              boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15,
  },
  card: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 4, // Android shadow
    // boxShadow is applied inline because it needs dynamic color? Actually boxShadow color is fixed, we can put it in StyleSheet.
    // But we already set inline with theme. However we can move to StyleSheet if we want a static shadow.
    // For simplicity, we set inline in renderItem.
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  role: {
    marginTop: 4,
    fontSize: 14,
  },
  contact: {
    marginTop: 4,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-between",
  },
  callBtn: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 20,
    flex: 0.48,
    alignItems: "center",
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
    padding: 10,
    borderRadius: 20,
    flex: 0.48,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
  supportBtn: {
    position: "absolute",
    bottom: 70,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    elevation: 5,
  },
  supportText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backBtn: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});