import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/utils/api';
import { Project, AITeamResponse } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const roleColors: [string, string][] = [
  ['#3B82F6', '#06B6D4'],
  ['#8B5CF6', '#EC4899'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#EF4444'],
  ['#6366F1', '#8B5CF6'],
];

export default function AIBuilder() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const { user } = useAuthStore();
  
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [result, setResult] = useState<AITeamResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects({ status: 'open' });
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleBuildTeam = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please describe your team needs');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.buildTeamWithAI({
        prompt,
        project_id: selectedProject || undefined,
      });
      setResult(response);
      Alert.alert('Success', 'Team recommendations generated!');
    } catch (error) {
      console.error('Error building team:', error);
      Alert.alert('Error', 'Failed to build team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitations = () => {
    Alert.alert('Success', 'Invitations sent to recommended team members!');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.headerIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="sparkles" size={28} color="#FFFFFF" />
              </LinearGradient>
              <ThemedText size="2xl" weight="bold">
                AI Team Builder
              </ThemedText>
            </View>
            <ThemedText variant="secondary" size="lg">
              Let AI find the perfect team members for your project
            </ThemedText>
          </View>

          <View style={styles.content}>
            {/* Main Form */}
            <Card style={styles.formCard}>
              <View style={styles.formHeader}>
                <Ionicons name="rocket" size={24} color={theme.primary} />
                <ThemedText size="xl" weight="bold">Build Your Dream Team</ThemedText>
              </View>

              {/* Project Selection */}
              <View style={styles.inputGroup}>
                <ThemedText variant="secondary" size="sm" style={styles.label}>
                  Select Project (Optional)
                </ThemedText>
                <View style={[styles.pickerContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() => {
                      // Simple project selection - could be enhanced with a modal
                      if (projects.length > 0) {
                        const nextIndex = selectedProject 
                          ? (projects.findIndex(p => p.project_id === selectedProject) + 1) % (projects.length + 1)
                          : 0;
                        setSelectedProject(nextIndex === projects.length ? '' : projects[nextIndex]?.project_id || '');
                      }
                    }}
                  >
                    <ThemedText>
                      {selectedProject 
                        ? projects.find(p => p.project_id === selectedProject)?.title || 'Select a project'
                        : '-- No specific project --'}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Prompt Input */}
              <View style={styles.inputGroup}>
                <ThemedText variant="secondary" size="sm" style={styles.label}>
                  Describe Your Team Needs
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }
                  ]}
                  placeholder="Example: I need a team for a fintech hackathon. Looking for a React developer with UI/UX skills, a Python backend developer experienced with APIs, and someone great at pitching ideas."
                  placeholderTextColor={theme.textTertiary}
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <ThemedText variant="tertiary" size="sm" style={styles.hint}>
                  Be specific about skills, experience level, and project requirements
                </ThemedText>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleBuildTeam}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#FFFFFF" />
                      <ThemedText style={styles.submitText}>Building Your Team...</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                      <ThemedText style={styles.submitText}>Generate Team Recommendations</ThemedText>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Card>

            {/* Tips Card */}
            <Card style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={24} color="#F59E0B" />
                <ThemedText size="lg" weight="semibold">Tips</ThemedText>
              </View>
              <View style={styles.tipsList}>
                {[
                  'Be specific about required skills and experience',
                  'Mention project type and timeline',
                  'Include soft skills if important',
                  'Specify team size preferences',
                ].map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <ThemedText style={{ color: theme.primary }}>•</ThemedText>
                    <ThemedText variant="secondary" size="sm">{tip}</ThemedText>
                  </View>
                ))}
              </View>
            </Card>

            {/* How It Works */}
            <Card style={styles.howItWorksCard}>
              <View style={styles.howItWorksHeader}>
                <Ionicons name="people" size={24} color={theme.primary} />
                <ThemedText size="lg" weight="semibold">How It Works</ThemedText>
              </View>
              <View style={styles.stepsList}>
                {[
                  'Describe your needs',
                  'AI analyzes requirements',
                  'Get matched with talent',
                  'Send invitations',
                ].map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6']}
                      style={styles.stepNumber}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <ThemedText style={{ color: '#FFF' }} size="xs" weight="bold">{index + 1}</ThemedText>
                    </LinearGradient>
                    <ThemedText variant="secondary" size="sm">{step}</ThemedText>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          {/* Results */}
          {result && (
            <View style={styles.resultsSection}>
              <Card style={styles.resultsCard}>
                <View style={styles.resultsHeader}>
                  <Ionicons name="checkmark-circle" size={28} color={theme.success} />
                  <ThemedText size="xl" weight="bold">AI Recommendations</ThemedText>
                </View>

                {/* Analysis */}
                <View style={[styles.analysisBox, { backgroundColor: theme.surfaceVariant }]}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="bulb" size={20} color="#F59E0B" />
                    <ThemedText weight="semibold">Analysis</ThemedText>
                  </View>
                  <ThemedText variant="secondary">{result.analysis}</ThemedText>
                </View>

                {/* Recommendations */}
                <ThemedText size="lg" weight="bold" style={styles.recommendationsTitle}>
                  Recommended Team Members
                </ThemedText>
                <View style={styles.recommendationsGrid}>
                  {result.recommendations.map((rec, index) => (
                    <Card 
                      key={index} 
                      style={[styles.recommendationCard, { borderColor: theme.border }]}
                    >
                      <View style={styles.recHeader}>
                        <LinearGradient
                          colors={roleColors[index % roleColors.length]}
                          style={styles.recAvatar}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <ThemedText style={{ color: '#FFF' }} weight="bold" size="lg">
                            {rec.name.charAt(0)}
                          </ThemedText>
                        </LinearGradient>
                        <View style={styles.recInfo}>
                          <ThemedText weight="bold" size="lg">{rec.name}</ThemedText>
                          <ThemedText style={{ color: roleColors[index % roleColors.length][0] }} size="sm" weight="medium">
                            {rec.role}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText variant="secondary" size="sm">{rec.reasoning}</ThemedText>
                    </Card>
                  ))}
                </View>

                {/* Introduction Message */}
                <View style={[styles.messageBox, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
                  <View style={styles.messageHeader}>
                    <Ionicons name="paper-plane" size={20} color={theme.success} />
                    <ThemedText weight="semibold">Introduction Message</ThemedText>
                  </View>
                  <ThemedText variant="secondary">{result.introduction_message}</ThemedText>
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.approveButton} onPress={handleSendInvitations}>
                  <LinearGradient
                    colors={['#10B981', '#34D399']}
                    style={styles.approveGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <ThemedText style={styles.approveText}>Approve & Send Invitations</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </Card>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  formCard: {
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 140,
  },
  hint: {
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  tipsCard: {
    padding: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 8,
  },
  howItWorksCard: {
    padding: 16,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsSection: {
    padding: 16,
    paddingTop: 0,
  },
  resultsCard: {
    padding: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  analysisBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationsTitle: {
    marginBottom: 16,
  },
  recommendationsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  recommendationCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  recAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recInfo: {
    flex: 1,
  },
  messageBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  approveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  approveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
