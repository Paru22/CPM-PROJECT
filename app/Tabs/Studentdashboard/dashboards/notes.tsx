import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import { useAuth } from "../../../../context/AuthContext";

interface Note {
  id: string;
  title: string;
  link: string;
  subjectName: string;
  semester: string;
  department: string;
  createdAt: any;
}

export default function StudentNotesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const studentDepartment = user?.department;
        const studentSemester = user?.semester;
        
        if (!studentDepartment || !studentSemester) {
          setNotes([]);
          setFetching(false);
          return;
        }

        // REMOVED orderBy from the query - just filter
        const notesQuery = query(
          collection(db, "notes"),
          where("department", "==", studentDepartment),
          where("semester", "==", studentSemester)
        );
        
        const snapshot = await getDocs(notesQuery);
        
        const notesList: Note[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Note));
        
        // Sort manually on client side (no index needed!)
        const sortedNotes = [...notesList].sort((a, b) => {
          // Helper function to extract timestamp
          const getTimestamp = (date: any): number => {
            if (!date) return 0;
            if (date.toDate) {
              return date.toDate().getTime();
            }
            if (date instanceof Date) {
              return date.getTime();
            }
            if (typeof date === 'string') {
              return new Date(date).getTime();
            }
            if (typeof date === 'number') {
              return date;
            }
            return 0;
          };
          
          const timeA = getTimestamp(a.createdAt);
          const timeB = getTimestamp(b.createdAt);
          
          // Descending order (newest first)
          return timeB - timeA;
        });
        
        setNotes(sortedNotes);
      } catch (error) {
        console.error("Error fetching notes:", error);
        Alert.alert("Error", "Failed to fetch notes.");
        setNotes([]);
      } finally {
        setFetching(false);
        
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
      }
    };

    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.department, user?.semester]);

  const openLink = async (url: string = "") => {
    if (!url) {
      Alert.alert("Error", "No link available");
      return;
    }
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Invalid Link", "Cannot open this link.");
      }
    } catch {
      Alert.alert("Error", "Failed to open link.");
    }
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => (
    <TouchableOpacity
      style={[styles.noteItem, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
      onPress={() => openLink(item.link)}
    >
      <View style={styles.noteHeader}>
        <View style={[styles.noteIndex, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.noteIndexText, { color: colors.primary }]}>{index + 1}</Text>
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
      
      <View style={[styles.openButton, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name="open-outline" size={16} color={colors.primary} />
        <Text style={[styles.openButtonText, { color: colors.primary }]}>Open Note</Text>
      </View>
    </TouchableOpacity>
  );

  if (fetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading notes...</Text>
        </View>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textDark }]}>Study Notes</Text>
        </View>
        
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          {user?.department} • Semester {user?.semester}
        </Text>

        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                No notes available for your semester
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                Notes will appear here once teachers upload them
              </Text>
            </View>
          }
        />

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", marginVertical: 15, gap: 10 },
  backIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 13, marginBottom: 15, textAlign: "center" },
  noteItem: {
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  noteIndex: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  noteIndexText: { fontSize: 14, fontWeight: "bold" },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  noteMeta: { flexDirection: "row", gap: 8 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.05)" },
  metaText: { fontSize: 11, fontWeight: "500" },
  openButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8 },
  openButtonText: { fontSize: 13, fontWeight: "600" },
  emptyBox: { alignItems: "center", marginTop: 150 },
  emptyText: { fontSize: 16, marginTop: 10 },
  emptySubtext: { fontSize: 13, marginTop: 5, textAlign: "center" },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    elevation: 5,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});