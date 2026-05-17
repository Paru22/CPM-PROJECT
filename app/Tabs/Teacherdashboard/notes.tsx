import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
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
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";

interface Note {
  id: string;
  title: string;
  link: string;
  subjectName: string;
  semester: string;
  department: string;
  createdAt: any;
}

interface AssignedSubject {
  id: string;
  teacherId: string;
  subjectName: string;
  semester: string;
  department: string;
}

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

export default function TeacherUploadNotesPage() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Fetch teacher's assigned subjects
  const fetchAssignedSubjects = useCallback(async () => {
    if (!user?.uid || !user?.department) return;
    
    try {
      const subjectsQuery = query(
        collection(db, "teacherSubjects"),
        where("teacherId", "==", user.uid)
      );
      const snapshot = await getDocs(subjectsQuery);
      const subjects: AssignedSubject[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AssignedSubject));
      
      setAssignedSubjects(subjects);
      
      // Auto-select first subject if available
      if (subjects.length > 0 && !selectedSubject) {
        setSelectedSubject(subjects[0].subjectName || "");
        setSelectedSemester(subjects[0].semester?.toString() || "");
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }, [user, selectedSubject]);

  // Fetch notes by department (teacher sees all notes in their department)
  const fetchNotes = useCallback(async () => {
    if (!user?.department) return;
    
    try {
      setLoadingNotes(true);
      
      // Teachers see all notes in their department
      const notesQuery = query(
        collection(db, "notes"),
        where("department", "==", user.department),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(notesQuery);
      const notesList: Note[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Note));
      
      setNotes(notesList);
    } catch (error) {
      console.error("Error fetching notes:", error);
      
      // Fallback without orderBy
      try {
        const notesQuery = query(
          collection(db, "notes"),
          where("department", "==", user.department)
        );
        const snapshot = await getDocs(notesQuery);
        const notesList: Note[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Note));
        
        // Sort manually
        notesList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setNotes(notesList);
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
      }
    } finally {
      setLoadingNotes(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignedSubjects();
    fetchNotes();
  }, [fetchAssignedSubjects, fetchNotes]);

  const handleUpload = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a note title.");
      return;
    }

    if (!link.trim()) {
      Alert.alert("Error", "Please enter a link.");
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(link.trim())) {
      Alert.alert("Error", "Please enter a valid URL (starting with http:// or https://).");
      return;
    }

    if (!selectedSubject) {
      Alert.alert("Error", "Please select a subject.");
      return;
    }

    if (!selectedSemester) {
      Alert.alert("Error", "Please select a semester.");
      return;
    }

    if (!user?.department) {
      Alert.alert("Error", "Department not assigned.");
      return;
    }

    setUploading(true);

    try {
      // Simple note structure - no uploadedBy needed
      const noteData = {
        title: title.trim(),
        link: link.trim(),
        subjectName: selectedSubject,
        semester: selectedSemester,
        department: user.department,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "notes"), noteData);

      Alert.alert("Success", "Note uploaded successfully!");
      setTitle("");
      setLink("");
      fetchNotes();
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload note. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      await deleteDoc(doc(db, "notes", noteToDelete.id));
      Alert.alert("Success", "Note deleted successfully!");
      setDeleteConfirmVisible(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete note.");
    }
  };

  const openLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open the link.");
      });
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <View style={[styles.noteItem, { backgroundColor: colors.card }]}>
      <View style={styles.noteHeader}>
        <View style={styles.noteIconContainer}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>
        <View style={styles.noteContent}>
          <Text style={[styles.noteTitle, { color: colors.textDark }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.noteMeta}>
            <View style={styles.metaBadge}>
              <Ionicons name="book-outline" size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {item.subjectName}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={12} color={colors.textLight} />
              <Text style={[styles.metaText, { color: colors.textLight }]}>
                Sem {item.semester}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.linkButton, { backgroundColor: colors.primary + "15" }]}
        onPress={() => openLink(item.link)}
      >
        <Ionicons name="link" size={16} color={colors.primary} />
        <Text style={[styles.linkButtonText, { color: colors.primary }]} numberOfLines={1}>
          Open Link
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => {
          setNoteToDelete(item);
          setDeleteConfirmVisible(true);
        }}
      >
        <Ionicons name="trash-outline" size={18} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Upload Notes</Text>
            <Text style={styles.headerSubtitle}>
              {user?.department || "Share study materials"}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Upload Form */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Add New Note</Text>
          
          <TextInput
            placeholder="Note Title *"
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { borderColor: colors.border, color: colors.textDark, backgroundColor: colors.background }]}
          />

          <TextInput
            placeholder="Link (https://...) *"
            placeholderTextColor={colors.textLight}
            value={link}
            onChangeText={setLink}
            style={[styles.input, { borderColor: colors.border, color: colors.textDark, backgroundColor: colors.background }]}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.textDark }]}>Subject *</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Picker
              selectedValue={selectedSubject}
              onValueChange={(value: string) => {
                setSelectedSubject(value);
                const subject = assignedSubjects.find(s => s.subjectName === value);
                if (subject) {
                  setSelectedSemester(subject.semester?.toString() || "");
                }
              }}
              dropdownIconColor={colors.textDark}
            >
              <Picker.Item label="Select Subject" value="" color={colors.textLight} />
              {assignedSubjects.map((subject) => (
                <Picker.Item 
                  key={subject.id} 
                  label={`${subject.subjectName} (Sem ${subject.semester})`} 
                  value={subject.subjectName} 
                  color={colors.textDark}
                />
              ))}
            </Picker>
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Semester *</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Picker
              selectedValue={selectedSemester}
              onValueChange={(value: string) => setSelectedSemester(value)}
              dropdownIconColor={colors.textDark}
            >
              <Picker.Item label="Select Semester" value="" color={colors.textLight} />
              {SEMESTERS.map((sem) => (
                <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} color={colors.textDark} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.primary }, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.uploadButtonContent}>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Note</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes List */}
        <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>
          Uploaded Notes ({notes.length})
        </Text>

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
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No notes uploaded yet
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent={true}
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <Ionicons name="warning-outline" size={50} color="#F44336" />
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>Delete Note</Text>
            <Text style={[styles.confirmText, { color: colors.textLight }]}>
              Are you sure you want to delete this note?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setNoteToDelete(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textDark }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleDeleteNote}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  inputContainer: { padding: 16, borderRadius: 16, marginBottom: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 12 },
  pickerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  uploadButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  uploadButtonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  listContainer: { paddingBottom: 20 },
  noteItem: { padding: 16, borderRadius: 14, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, position: "relative" },
  noteHeader: { flexDirection: "row", marginBottom: 10 },
  noteIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  noteMeta: { flexDirection: "row", gap: 8 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.05)" },
  metaText: { fontSize: 11, fontWeight: "500" },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  linkButtonText: { fontSize: 13, fontWeight: "500", flex: 1 },
  deleteButton: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  loader: { marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  confirmModal: { borderRadius: 24, padding: 24, width: "85%", alignItems: "center" },
  confirmTitle: { fontSize: 20, fontWeight: "bold", marginTop: 12 },
  confirmText: { fontSize: 14, textAlign: "center", marginTop: 12, marginBottom: 24 },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelButton: {},
  cancelButtonText: { fontWeight: "600" },
  deleteConfirmButton: { backgroundColor: "#F44336" },
  deleteConfirmText: { color: "#fff", fontWeight: "600" },
});