import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { api } from '../../src/utils/api';
import { Project, User } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [projectsData, usersData] = await Promise.all([
        api.getProjects({ status: 'open' }),
        api.getUsers().catch(() => []),
      ]);
      setProjects(projectsData);
      setUsers(usersData);
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

  const stats = [
    { 
      label: 'Active Users', 
      value: users.length.toString(), 
      icon: 'people',
      gradient: ['#3B82F6', '#06B6D4']
    },
    { 
      label: 'Projects', 
      value: projects.length.toString(), 
      icon: 'briefcase',
      gradient: ['#8B5CF6', '#EC4899']
    },
    { 
      label: 'Open Positions', 
      value: projects.reduce((acc, p) => acc + (p.team_size - p.current_members), 0).toString(), 
      icon: 'sparkles',
      gradient: ['#10B981', '#34D399']
    },
    { 
      label: 'Categories', 
      value: '4', 
      icon: 'grid',
      gradient: ['#F59E0B', '#EF4444']
    },
  ];

  const quickActions = [
    {
      title: 'Edit Profile',
      description: 'Update your skills and experience',
      icon: 'person',
      route: '/(tabs)/profile',
      gradient: ['#3B82F6', '#06B6D4']
    },
    {
      title: 'Browse Projects',
      description: 'Find exciting projects to join',
      icon: 'folder',
      route: '/(tabs)/projects',
      gradient: ['#8B5CF6', '#EC4899']
    },
    {
      title: 'AI Team Builder',
      description: 'Let AI find your perfect team',
      icon: 'sparkles',
      route: '/(tabs)/ai-builder',
      gradient: ['#10B981', '#34D399']
    },
  ];

  const howItWorks = [
    { step: '1', title: 'Create Profile', desc: 'Add your skills and experience' },
    { step: '2', title: 'Browse Projects', desc: 'Find projects that match your interests' },
    { step: '3', title: 'Get Matched', desc: 'AI finds the best teammates for you' },
    { step: '4', title: 'Build Together', desc: 'Collaborate and create amazing things' },
  ];

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
        {/* Hero Section */}
        <View style={styles.hero}>
          <ThemedText size="2xl" weight="bold" style={styles.heroTitle}>
            Welcome Back! 👋
          </ThemedText>
          <ThemedText variant="secondary" size="lg">
            Ready to build amazing teams today?
          </ThemedText>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statContent}>
                <View>
                  <ThemedText variant="secondary" size="sm">{stat.label}</ThemedText>
                  <ThemedText size="2xl" weight="bold">{stat.value}</ThemedText>
                </View>
                <LinearGradient
                  colors={stat.gradient as [string, string]}
                  style={styles.statIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={stat.icon as any} size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText size="xl" weight="bold" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={action.gradient as [string, string]}
                  style={styles.actionIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
                </LinearGradient>
                <ThemedText weight="semibold" style={styles.actionTitle}>
                  {action.title}
                </ThemedText>
                <ThemedText variant="secondary" size="sm">
                  {action.description}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <Card style={styles.howItWorks}>
          <View style={styles.howItWorksHeader}>
            <Ionicons name="bulb" size={28} color="#F59E0B" />
            <ThemedText size="xl" weight="bold">How It Works</ThemedText>
          </View>
          <View style={styles.stepsContainer}>
            {howItWorks.map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  style={styles.stepNumber}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <ThemedText style={{ color: '#FFF' }} weight="bold">{item.step}</ThemedText>
                </LinearGradient>
                <ThemedText weight="semibold" style={styles.stepTitle}>{item.title}</ThemedText>
                <ThemedText variant="secondary" size="sm" style={styles.stepDesc}>{item.desc}</ThemedText>
              </View>
            ))}
          </View>
        </Card>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText size="xl" weight="bold">Recent Projects</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
                <ThemedText style={{ color: theme.primary }}>See all</ThemedText>
              </TouchableOpacity>
            </View>
            {projects.slice(0, 3).map((project) => (
              <Card 
                key={project.project_id} 
                style={styles.projectCard}
                onPress={() => router.push(`/project/${project.project_id}`)}
              >
                <View style={styles.projectHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                    <ThemedText size="xs" style={{ color: theme.primary }}>
                      {project.category.replace('_', ' ')}
                    </ThemedText>
                  </View>
                  <View style={styles.memberCount}>
                    <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                    <ThemedText variant="secondary" size="xs">
                      {project.current_members}/{project.team_size}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText weight="semibold" size="lg">{project.title}</ThemedText>
                <ThemedText variant="secondary" size="sm" numberOfLines={2}>
                  {project.description}
                </ThemedText>
                <View style={styles.skillsRow}>
                  {project.required_skills.slice(0, 3).map((skill, idx) => (
                    <View key={idx} style={[styles.skillBadge, { backgroundColor: theme.surfaceVariant }]}>
                      <ThemedText size="xs">{skill}</ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  hero: {
    marginBottom: 24,
  },
  heroTitle: {
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    marginBottom: 4,
  },
  howItWorks: {
    marginBottom: 24,
    padding: 20,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stepItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
  stepDesc: {
    textAlign: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
