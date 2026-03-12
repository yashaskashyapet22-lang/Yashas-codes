import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { SkillBadge } from '../../src/components/SkillBadge';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { api } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: 'hackathon', label: 'Hackathon', icon: 'trophy' },
  { id: 'startup', label: 'Startup', icon: 'rocket' },
  { id: 'learning', label: 'Learning', icon: 'school' },
  { id: 'side_project', label: 'Side Project', icon: 'bulb' },
];

export default function CreateProject() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('hackathon');
  const [teamSize, setTeamSize] = useState(4);
  const [deadline, setDeadline] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddSkill = () => {
    if (!newSkill.trim() || skills.includes(newSkill.trim())) return;
    setSkills([...skills, newSkill.trim()]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a project title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a project description');
      return;
    }

    setSaving(true);
    try {
      const project = await api.createProject({
        title: title.trim(),
        description: description.trim(),
        category,
        required_skills: skills,
        team_size: teamSize,
        deadline: deadline || undefined,
      });
      Alert.alert('Success', 'Project created successfully!', [
        { text: 'OK', onPress: () => router.replace(`/project/${project.project_id}`) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Project' }} />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container}>
          {/* Title */}
          <Input
            label="Project Title"
            placeholder="Enter project title"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Input
            label="Description"
            placeholder="Describe your project..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
          />

          {/* Category */}
          <View style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Category</ThemedText>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: category === cat.id ? theme.primary + '20' : theme.surface,
                      borderColor: category === cat.id ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={24} 
                    color={category === cat.id ? theme.primary : theme.textSecondary} 
                  />
                  <ThemedText 
                    size="sm"
                    style={{ color: category === cat.id ? theme.primary : theme.text }}
                  >
                    {cat.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Team Size */}
          <View style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Team Size</ThemedText>
            <View style={styles.teamSizeContainer}>
              <TouchableOpacity
                style={[styles.teamSizeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setTeamSize(Math.max(2, teamSize - 1))}
              >
                <Ionicons name="remove" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={[styles.teamSizeValue, { backgroundColor: theme.surfaceVariant }]}>
                <ThemedText size="xl" weight="bold">{teamSize}</ThemedText>
                <ThemedText variant="secondary" size="sm">members</ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.teamSizeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setTeamSize(Math.min(10, teamSize + 1))}
              >
                <Ionicons name="add" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Required Skills */}
          <View style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Required Skills</ThemedText>
            <View style={styles.skillsContainer}>
              {skills.map((skill, idx) => (
                <SkillBadge 
                  key={idx} 
                  name={skill} 
                  onRemove={() => handleRemoveSkill(skill)} 
                />
              ))}
            </View>
            <View style={styles.addSkillRow}>
              <Input
                placeholder="Add a skill"
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={handleAddSkill}
                containerStyle={styles.skillInput}
              />
              <TouchableOpacity
                style={[styles.addSkillButton, { backgroundColor: theme.primary }]}
                onPress={handleAddSkill}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Deadline */}
          <Input
            label="Deadline (Optional)"
            placeholder="e.g., December 2025"
            value={deadline}
            onChangeText={setDeadline}
          />

          {/* Create Button */}
          <Button
            title="Create Project"
            onPress={handleCreate}
            loading={saving}
            size="lg"
            style={styles.createButton}
          />

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  teamSizeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  teamSizeValue: {
    width: 100,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  addSkillRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    marginBottom: 0,
  },
  addSkillButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    marginTop: 24,
  },
});
