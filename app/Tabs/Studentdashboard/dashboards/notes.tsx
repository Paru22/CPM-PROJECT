import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig";
import Colors from "../../../../assets/images/colors";

interface Note {
  id: string;
  name: string;
  link: string;
}

const { height } = Dimensions.get("window");

export default function StudentNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(true);

  // Animation
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
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to fetch notes.");
      } finally {
        setFetching(false);

        // Start animation after loading
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
  }, []);

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Invalid Link", "Cannot open this link.");
    }
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => {
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
        <TouchableOpacity
          style={styles.noteItem}
          activeOpacity={0.8}
          onPress={() => openLink(item.link)}
        >
          <Text style={styles.noteTitle}>{item.name}</Text>
          <Text style={styles.noteLink}>Tap to open 📄</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={styles.title}>📚 Study Notes</Text>

        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No notes available 😕</Text>
            </View>
          }
        />

        {/* Floating Back Button */}
        <TouchableOpacity
          style={styles.backButton}
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
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.textDark,
    textAlign: "center",
    marginVertical: 15,
  },

  noteItem: {
    backgroundColor: Colors.card,
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  noteTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textDark,
  },

  noteLink: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 6,
  },

  loadingText: {
    textAlign: "center",
    marginTop: 10,
    color: Colors.textDark,
  },

  emptyBox: {
    marginTop: height * 0.2,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: Colors.textDark,
  },

  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.secondary,
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