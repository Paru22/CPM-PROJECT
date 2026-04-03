import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig";
import Colors from "../../../../assets/images/colors";

import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

interface MarkItem {
  id: string;
  subject: string;
  marks: number;
  grade: string;
}

// 🎯 Auto Grade Function
const getGrade = (marks: number) => {
  if (marks >= 90) return "A+";
  if (marks >= 80) return "A";
  if (marks >= 70) return "B+";
  if (marks >= 60) return "B";
  return "C";
};

export default function MarksProfilePage() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams();

  const [marksData, setMarksData] = useState<MarkItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "All" | "A+" | "A" | "B+" | "B" | "C"
  >("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!studentId) return;

      try {
        const studentDocRef = doc(db, "students", studentId as string);
        const studentSnap = await getDoc(studentDocRef);

        if (!studentSnap.exists()) {
          Alert.alert("Error", "Student not found.");
          return;
        }

        const data = studentSnap.data();
        const marksMap = data.marks || {};

        const marksArray: MarkItem[] = Object.keys(marksMap).map(
          (key, index) => {
            const marks = marksMap[key].marks;

            return {
              id: `${studentId}-${index}`,
              subject: key,
              marks,
              grade: getGrade(marks), // ✅ auto grade
            };
          }
        );

        setMarksData(marksArray);
      } catch (err) {
        Alert.alert("Error", "Failed to load marks.");
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [studentId]);

  const totalMarks = marksData.reduce((sum, m) => sum + m.marks, 0);
  const avgMarks =
    marksData.length > 0 ? (totalMarks / marksData.length).toFixed(2) : "0";

  const filteredData =
    selectedFilter === "All"
      ? marksData
      : marksData.filter((item) => item.grade === selectedFilter);

  // 🎨 Grade Colors
  const getColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "#4CAF50";
    if (grade.includes("B")) return "#FF9800";
    return "#F44336";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <Animated.Text entering={FadeIn} style={styles.title}>
          📊 Marks Dashboard
        </Animated.Text>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>Total: {totalMarks}</Text>
          <Text style={styles.summaryText}>Average: {avgMarks}</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {["All", "A+", "A", "B+", "B", "C"].map((grade) => (
            <TouchableOpacity
              key={grade}
              onPress={() =>
                setSelectedFilter(
                  grade as "All" | "A+" | "A" | "B+" | "B" | "C"
                )
              }
              style={[
                styles.filterButton,
                selectedFilter === grade && styles.selectedFilter,
              ]}
            >
              <Text style={styles.filterText}>{grade}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Marks List */}
        {filteredData.map((item, index) => {
          const percent = item.marks;

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 100)}
              style={styles.card}
            >
              <Text style={styles.subject}>{item.subject}</Text>

              <Text style={styles.marks}>Marks: {item.marks}</Text>

              <Text style={[styles.grade, { color: getColor(item.grade) }]}>
                Grade: {item.grade}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: getColor(item.grade),
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        })}

        {/* Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  summaryContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
  },

  summaryText: {
    fontSize: 16,
    fontWeight: "600",
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 15,
  },

  filterButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 5,
    borderRadius: 20,
  },

  selectedFilter: {
    backgroundColor: "#6c63ff",
  },

  filterText: {
    color: "#333",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  subject: {
    fontSize: 18,
    fontWeight: "bold",
  },

  marks: {
    marginTop: 5,
  },

  grade: {
    marginTop: 5,
    fontWeight: "bold",
  },

  progressBar: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
  },

  backButton: {
    backgroundColor: "#6c63ff",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },

  backText: {
    color: "#fff",
    fontWeight: "bold",
  },
});