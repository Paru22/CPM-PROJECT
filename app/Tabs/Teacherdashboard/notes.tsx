import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Colors from "../../../assets/images/colors";

interface Note {
  id: string;
  name: string;
  link: string;
  createdAt: string;
}

export default function TeacherUploadNotesPage() {
  const router = useRouter();
  const { teacherId } = useLocalSearchParams();

  // convert teacherId to a string
  const finalTeacherId = Array.isArray(teacherId) ? teacherId[0] : teacherId;

  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    if (finalTeacherId) {
      fetchNotes();
    }
  }, [finalTeacherId]);

  const fetchNotes = async () => {
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
  };

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

      // Step 1: Read teacher document
      const snapshot = await getDoc(teacherRef);

      if (!snapshot.exists()) {
        Alert.alert("Error", "Teacher does not exist in database.");
        setUploading(false);
        return;
      }

      // Step 2: Get existing notes or set empty map
      const existingNotes = snapshot.data().notes || {};

      // Step 3: Generate a new note ID
      const noteId = `note_${Date.now()}`;

      // Step 4: Add new note
      existingNotes[noteId] = {
        name,
        link,
        createdAt: new Date().toISOString(),
      };

      // Step 5: Update Firestore with full notes object
      await updateDoc(teacherRef, { notes: existingNotes });

      Alert.alert("Success", "Note uploaded successfully!");

      setName("");
      setLink("");

      // Refresh notes list
      fetchNotes();
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload note.");
    } finally {
      setUploading(false);
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <View style={styles.noteItem}>
      <Text style={styles.noteText}>Name: {item.name}</Text>
      <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
        <Text style={[styles.noteText, styles.linkText]}>Link: {item.link}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Upload Notes</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Note Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="PDF Link (https://...)"
          value={link}
          onChangeText={setLink}
          style={styles.input}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? "Uploading..." : "Upload Note"}
          </Text>
        </TouchableOpacity>
      </View>

      {loadingNotes ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notes uploaded yet.</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textDark,
    textAlign: "center",
    marginBottom: 22,
    letterSpacing: 0.4,
  },

  /* INPUT WRAPPER CARD */
  inputContainer: {
    backgroundColor: Colors.card,
    padding: 18,
    borderRadius: 14,
    marginBottom: 22,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  /* TEXT INPUT FIELDS */
  input: {
    borderWidth: 1.4,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 12,
    backgroundColor: "#ffffffff",
  },

  /* UPLOAD BUTTON */
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    elevation: 3,
  },

  uploadButtonText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* NOTES LIST */
  listContainer: {
    paddingBottom: 20,
  },

  noteItem: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  noteText: {
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 6,
    fontWeight: "600",
  },

  linkText: {
    color: Colors.secondary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },

  emptyText: {
    textAlign: "center",
    color: Colors.textDark,
    fontSize: 16,
    marginTop: 10,
    letterSpacing: 0.3,
  },

  /* BACK BUTTON */
  backButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 26,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },

  backButtonText: {
    color: Colors.card,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
