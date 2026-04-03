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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../../../assets/images/colors";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

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
  const [facultyData, setFacultyData] = useState<FacultyItem[]>([]);

  // Animation
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
  }, []);

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

  const renderItem = ({ item, index }: { item: FacultyItem; index: number }) => {
    const itemAnim = new Animated.Value(0);

    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [
            {
              translateY: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.role}>{item.role}</Text>
          <Text style={styles.contact}>{item.contact}</Text>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => makeCall(item.contact)}
            >
              <Text style={styles.btnText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => openWhatsApp(item.contact)}
            >
              <Text style={styles.btnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const callSupport = () => {
    makeCall("+1234567899");
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={styles.title}>📞 Help & Support</Text>

        <FlatList
          data={facultyData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        />

        {/* Call Support Floating Button */}
        <TouchableOpacity style={styles.supportBtn} onPress={callSupport}>
          <Text style={styles.supportText}>📲 Call Support</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
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
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: Colors.textDark,
    marginVertical: 15,
  },

  card: {
    backgroundColor: Colors.card,
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textDark,
  },

  role: {
    marginTop: 4,
    color: Colors.textDark,
    fontSize: 14,
  },

  contact: {
    marginTop: 4,
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.secondary,
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