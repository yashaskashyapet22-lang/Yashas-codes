import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { SkillBadge } from '../../src/components/SkillBadge';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { api } from '../../src/utils/api';
import { Project, Team, TeamInvite } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [projectsData, teamsData, invitesData] = await Promise.all([
        api.getProjects({ status: 'open' }),
        api.getTeams(),
        api.getInvites(),
      ]);
      setRecentProjects(projectsData.slice(0, 3));
      setMyTeams(teamsData);
      setInvites(invitesData);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRespondInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      await api.respondToInvite(inviteId, action);
      loadData();
    } catch (error) {
      console.error('Respond invite error:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText variant="secondary" size="sm">Welcome back,</ThemedText>
            <ThemedText size="xl" weight="bold">{user?.name || 'User'}</ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.avatar, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {user?.picture ? (
              <View style={styles.avatarImage}>
                <ThemedText size="lg" weight="bold">
                  {user.name?.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            ) : (
              <Ionicons name="person" size={24} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="add-circle"
            title="Create Project"
            onPress={() => router.push('/project/create')}
          />
          <QuickActionCard
            icon="sparkles"
            title="AI Team Builder"
            onPress={() => router.push('/(tabs)/ai-builder')}
          />
        </View>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <View style={styles.section}>
            <ThemedText size="lg" weight="semibold" style={styles.sectionTitle}>
              Pending Invites ({invites.length})
            </ThemedText>
            {invites.map((invite) => (
              <Card key={invite.invite_id} style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <View style={[styles.inviteAvatar, { backgroundColor: theme.primary }]}>
                    <ThemedText style={{ color: '#FFF' }} weight="bold">
                      {invite.inviter?.name?.charAt(0) || 'U'}
                    </ThemedText>
                  </View>
                  <View style={styles.inviteInfo}>
                    <ThemedText weight="semibold">{invite.inviter?.name}</ThemedText>
                    <ThemedText variant="secondary" size="sm">
                      invited you to join {invite.project?.title}
                    </ThemedText>
                  </View>
                </View>
                {invite.message && (
                  <ThemedText variant="secondary" size="sm" style={styles.inviteMessage}>
                    "{invite.message}"
                  </ThemedText>
                )}
                <View style={styles.inviteActions}>
                  <Button
                    title="Decline"
                    variant="outline"
                    size="sm"
                    onPress={() => handleRespondInvite(invite.invite_id, 'decline')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Accept"
                    size="sm"
                    onPress={() => handleRespondInvite(invite.invite_id, 'accept')}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* My Teams */}
        {myTeams.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText size="lg" weight="semibold">My Teams</ThemedText>
              <ThemedText variant="secondary" size="sm">{myTeams.length} teams</ThemedText>
            </View>
            {myTeams.slice(0, 3).map((team) => (
              <Card key={team.team_id} style={styles.teamCard}>
                <View style={styles.teamHeader}>
                  <View style={[styles.teamIcon, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons name="people" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.teamInfo}>
                    <ThemedText weight="semibold">{team.name}</ThemedText>
                    <ThemedText variant="secondary" size="sm">
                      {team.project?.title} • {team.members.length} members
                    </ThemedText>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText size="lg" weight="semibold">Open Projects</ThemedText>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
              <ThemedText style={{ color: theme.primary }} size="sm">See all</ThemedText>
            </TouchableOpacity>
          </View>
          {recentProjects.length === 0 ? (
            <Card>
              <ThemedText variant="secondary" style={{ textAlign: 'center' }}>
                No open projects yet. Create one!
              </ThemedText>
            </Card>
          ) : (
            recentProjects.map((project) => (
              <Card 
                key={project.project_id} 
                style={styles.projectCard}
                onPress={() => router.push(`/project/${project.project_id}`)}
              >
                <View style={styles.projectHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.surfaceVariant }]}>
                    <ThemedText size="xs" style={{ color: theme.primary }}>
                      {project.category.replace('_', ' ')}
                    </ThemedText>
                  </View>
                  <ThemedText variant="secondary" size="xs">
                    {project.current_members}/{project.team_size} members
                  </ThemedText>
                </View>
                <ThemedText weight="semibold" style={styles.projectTitle}>
                  {project.title}
                </ThemedText>
                <ThemedText variant="secondary" size="sm" numberOfLines={2}>
                  {project.description}
                </ThemedText>
                <View style={styles.skillsRow}>
                  {project.required_skills.slice(0, 3).map((skill, idx) => (
                    <SkillBadge key={idx} name={skill} variant="outline" />
                  ))}
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickActionCard({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  return (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
      </View>
      <ThemedText size="sm" weight="medium">{title}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
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
  inviteCard: {
    marginBottom: 12,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteMessage: {
    fontStyle: 'italic',
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCard: {
    marginBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  projectCard: {
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  projectTitle: {
    marginBottom: 4,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
});
