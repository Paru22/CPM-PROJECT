import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";

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

// Auto Grade Function
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
  const { colors } = useTheme();

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
              grade: getGrade(marks),
            };
          }
        );

        setMarksData(marksArray);
      } catch {
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

  const getGradeColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "#4CAF50";
    if (grade.includes("B")) return "#FF9800";
    return "#F44336";
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Animated.Text entering={FadeIn} style={[styles.title, { color: colors.textDark }]}>
          📊 Marks Dashboard
        </Animated.Text>

        {/* Summary Cards */}
        <View style={[styles.summaryContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryText, { color: colors.textDark }]}>Total: {totalMarks}</Text>
          <Text style={[styles.summaryText, { color: colors.textDark }]}>Average: {avgMarks}</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {["All", "A+", "A", "B+", "B", "C"].map((grade) => (
            <TouchableOpacity
              key={grade}
              onPress={() =>
                setSelectedFilter(grade as "All" | "A+" | "A" | "B+" | "B" | "C")
              }
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedFilter === grade ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selectedFilter === grade ? "#fff" : colors.textDark },
                ]}
              >
                {grade}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Marks List */}
        {filteredData.map((item, index) => {
          const percent = item.marks;
          const gradeColor = getGradeColor(item.grade);

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 100)}
              style={[styles.card, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.subject, { color: colors.textDark }]}>{item.subject}</Text>
              <Text style={[styles.marks, { color: colors.textLight }]}>Marks: {item.marks}</Text>
              <Text style={[styles.grade, { color: gradeColor }]}>Grade: {item.grade}</Text>

              {/* Progress Bar */}
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: gradeColor,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        })}

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles – no deprecated shadow* or textShadow* props
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
    elevation: 2, // Android shadow, no deprecation
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 5,
    borderRadius: 20,
    elevation: 1,
  },
  filterText: {
    fontWeight: "600",
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
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
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  backButton: {
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