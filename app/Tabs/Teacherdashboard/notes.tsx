import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

interface Note {
  id: string;
  name: string;
  link: string;
  createdAt: string;
}

export default function TeacherUploadNotesPage() {
  const router = useRouter();
  const { teacherId } = useLocalSearchParams();
  const { colors, theme, toggleTheme } = useTheme();

  // convert teacherId to a string
  const finalTeacherId = Array.isArray(teacherId) ? teacherId[0] : teacherId;

  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // ✅ Define fetchNotes FIRST with useCallback
  const fetchNotes = useCallback(async () => {
    if (!finalTeacherId) return;
    try {
      const teacherRef = doc(db, "teachers", finalTeacherId);
      const snapshot = await getDoc(teacherRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const existingNotes = data.notes || {};
        const notesList: Note[] = Object.entries(existingNotes).map(([id, note]: [string, any]) => ({
          id,
          name: note.name,
          link: note.link,
          createdAt: note.createdAt,
        }));
        setNotes(notesList);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      Alert.alert("Error", "Failed to fetch notes.");
    } finally {
      setLoadingNotes(false);
    }
  }, [finalTeacherId]);

  // ✅ Now useEffect can safely depend on fetchNotes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleUpload = async () => {
    if (!name || !link) {
      Alert.alert("Error", "Please enter both name and link.");
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(link)) {
      Alert.alert("Error", "Please enter a valid URL.");
      return;
    }

    if (!finalTeacherId) {
      Alert.alert("Error", "Teacher ID not found.");
      return;
    }

    setUploading(true);

    try {
      const teacherRef = doc(db, "teachers", finalTeacherId);

      const snapshot = await getDoc(teacherRef);
      if (!snapshot.exists()) {
        Alert.alert("Error", "Teacher does not exist in database.");
        setUploading(false);
        return;
      }

      const existingNotes = snapshot.data().notes || {};
      const noteId = `note_${Date.now()}`;
      existingNotes[noteId] = {
        name,
        link,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(teacherRef, { notes: existingNotes });

      Alert.alert("Success", "Note uploaded successfully!");
      setName("");
      setLink("");
      fetchNotes();
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload note.");
    } finally {
      setUploading(false);
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <View style={[styles.noteItem, { backgroundColor: colors.card }]}>
      <Text style={[styles.noteText, { color: colors.textDark }]}>Name: {item.name}</Text>
      <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
        <Text style={[styles.noteText, styles.linkText, { color: colors.secondary }]}>
          Link: {item.link}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Gradient, Back Button, Theme Toggle */}
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>📄 Upload Notes</Text>
            <Text style={styles.headerSubtitle}>Share study materials with students</Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
          <TextInput
            placeholder="Note Name"
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: colors.border, color: colors.textDark, backgroundColor: colors.background }]}
          />

          <TextInput
            placeholder="PDF Link (https://...)"
            placeholderTextColor={colors.textLight}
            value={link}
            onChangeText={setLink}
            style={[styles.input, { borderColor: colors.border, color: colors.textDark, backgroundColor: colors.background }]}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.primary }, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? "Uploading..." : "Upload Note"}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingNotes ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No notes uploaded yet.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 22,
    elevation: 4,
    boxShadow: "0px 3px 6px rgba(0,0,0,0.1)",
  },
  input: {
    borderWidth: 1.4,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  uploadButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    elevation: 3,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  noteItem: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
  },
  noteText: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: "600",
  },
  linkText: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  loader: {
    marginTop: 40,
  },
});