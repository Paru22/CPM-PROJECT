import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";

interface Note {
  id: string;
  name: string;
  link: string;
}

export default function StudentNotesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(true);

  // Container animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const teacherCollection = collection(db, "teachers");
        const teacherSnapshot = await getDocs(teacherCollection);

        let allNotes: Note[] = [];

        teacherSnapshot.forEach((doc) => {
          const data = doc.data();
          const notesMap = data.notes || {};

          Object.keys(notesMap).forEach((noteId) => {
            allNotes.push({
              id: noteId,
              name: notesMap[noteId].name,
              link: notesMap[noteId].link,
            });
          });
        });

        setNotes(allNotes);
      } catch  {
        // _error is intentionally unused, but ESLint accepts it
        Alert.alert("Error", "Failed to fetch notes.");
      } finally {
        setFetching(false);

        // Start container animation after loading
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
      }
    };

    fetchNotes();
  }, [fadeAnim, slideAnim]);

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Invalid Link", "Cannot open this link.");
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[
        styles.noteItem,
        {
          backgroundColor: colors.card,
          boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
        },
      ]}
      activeOpacity={0.8}
      onPress={() => openLink(item.link)}
    >
      <Text style={[styles.noteTitle, { color: colors.textDark }]}>{item.name}</Text>
      <Text style={[styles.noteLink, { color: colors.primary }]}>Tap to open 📄</Text>
    </TouchableOpacity>
  );

  if (fetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading notes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={[styles.title, { color: colors.textDark }]}>📚 Study Notes</Text>

        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                No notes available 😕
              </Text>
            </View>
          }
        />

        {/* Floating Back Button */}
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: colors.secondary,
              boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>⬅ Back</Text>
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
  noteItem: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 4, // Android shadow
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  noteLink: {
    fontSize: 14,
    marginTop: 6,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 10,
  },
  emptyBox: {
    marginTop: 200,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    elevation: 5,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});