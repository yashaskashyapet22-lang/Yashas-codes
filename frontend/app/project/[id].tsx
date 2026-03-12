import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { SkillBadge } from '../../src/components/SkillBadge';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/utils/api';
import { Project } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const { user } = useAuthStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    try {
      const data = await api.getProject(id);
      setProject(data);
    } catch (error) {
      console.error('Load project error:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!project || !project.team) return;
    try {
      await Share.share({
        message: `Join my team "${project.team.name}" for the project "${project.title}"! Use code: ${project.team.invite_code}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleJoinTeam = async () => {
    if (!project || !project.team) return;
    setJoining(true);
    try {
      await api.joinTeam(project.team.team_id, project.team.invite_code);
      Alert.alert('Success', 'You have joined the team!');
      loadProject();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const isOwner = project?.owner_id === user?.user_id;
  const isTeamMember = project?.team?.members.some(m => m.user_id === user?.user_id);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.loadingContainer}>
          <ThemedText>Project not found</ThemedText>
          <Button title="Go Back" onPress={() => router.back()} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: project.title }} />
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={{ color: theme.primary }} weight="medium">
              {project.category.replace('_', ' ')}
            </ThemedText>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: project.status === 'open' ? theme.success + '20' : theme.warning + '20' }
          ]}>
            <ThemedText 
              size="sm"
              style={{ color: project.status === 'open' ? theme.success : theme.warning }}
            >
              {project.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText size="2xl" weight="bold" style={styles.title}>
          {project.title}
        </ThemedText>

        <ThemedText variant="secondary" style={styles.description}>
          {project.description}
        </ThemedText>

        {/* Owner */}
        <Card style={styles.section}>
          <View style={styles.ownerRow}>
            <View style={[styles.ownerAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: '#FFF' }} weight="bold">
                {project.owner?.name?.charAt(0) || 'U'}
              </ThemedText>
            </View>
            <View style={styles.ownerInfo}>
              <ThemedText variant="secondary" size="sm">Created by</ThemedText>
              <ThemedText weight="semibold">{project.owner?.name}</ThemedText>
            </View>
            {isOwner && (
              <View style={[styles.ownerBadge, { backgroundColor: theme.primary }]}>
                <ThemedText size="xs" style={{ color: '#FFF' }}>You</ThemedText>
              </View>
            )}
          </View>
        </Card>

        {/* Required Skills */}
        {project.required_skills.length > 0 && (
          <Card style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Required Skills</ThemedText>
            <View style={styles.skillsContainer}>
              {project.required_skills.map((skill, idx) => (
                <SkillBadge key={idx} name={skill} />
              ))}
            </View>
          </Card>
        )}

        {/* Team */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText weight="semibold">Team</ThemedText>
            <ThemedText variant="secondary" size="sm">
              {project.current_members}/{project.team_size} members
            </ThemedText>
          </View>

          {project.team && project.team.members.map((member, idx) => (
            <View key={idx} style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: theme.surfaceVariant }]}>
                <ThemedText weight="semibold" size="sm">
                  {member.name.charAt(0)}
                </ThemedText>
              </View>
              <View style={styles.memberInfo}>
                <ThemedText weight="medium">{member.name}</ThemedText>
                <ThemedText variant="secondary" size="sm">{member.role}</ThemedText>
              </View>
              {member.user_id === user?.user_id && (
                <ThemedText variant="secondary" size="xs">(You)</ThemedText>
              )}
            </View>
          ))}

          {/* Join Team / Share */}
          {!isTeamMember && project.status === 'open' && project.current_members < project.team_size && (
            <Button
              title="Join Team"
              onPress={handleJoinTeam}
              loading={joining}
              style={styles.joinButton}
            />
          )}

          {isTeamMember && project.team && (
            <View style={styles.inviteSection}>
              <View style={[styles.inviteCode, { backgroundColor: theme.surfaceVariant }]}>
                <ThemedText variant="secondary" size="sm">Invite Code</ThemedText>
                <ThemedText size="lg" weight="bold" style={{ letterSpacing: 2 }}>
                  {project.team.invite_code}
                </ThemedText>
              </View>
              <Button
                title="Share Invite"
                variant="outline"
                icon={<Ionicons name="share-outline" size={18} color={theme.primary} />}
                onPress={handleShare}
              />
            </View>
          )}
        </Card>

        {/* Project Info */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              <View>
                <ThemedText variant="secondary" size="xs">Created</ThemedText>
                <ThemedText size="sm">
                  {new Date(project.created_at).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            {project.deadline && (
              <View style={styles.infoItem}>
                <Ionicons name="flag-outline" size={20} color={theme.textSecondary} />
                <View>
                  <ThemedText variant="secondary" size="xs">Deadline</ThemedText>
                  <ThemedText size="sm">{project.deadline}</ThemedText>
                </View>
              </View>
            )}
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  title: {
    marginBottom: 12,
  },
  description: {
    lineHeight: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  joinButton: {
    marginTop: 16,
  },
  inviteSection: {
    marginTop: 16,
    gap: 12,
  },
  inviteCode: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
