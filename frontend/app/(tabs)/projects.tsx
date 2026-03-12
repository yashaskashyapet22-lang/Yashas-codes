import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { SkillBadge } from '../../src/components/SkillBadge';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { api } from '../../src/utils/api';
import { Project } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'startup', label: 'Startup' },
  { id: 'learning', label: 'Learning' },
  { id: 'side_project', label: 'Side Project' },
];

export default function Projects() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadProjects = async () => {
    try {
      const data = await api.getProjects({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: search || undefined,
      });
      setProjects(data);
    } catch (error) {
      console.error('Load projects error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== '') {
        loadProjects();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <View style={styles.container}>
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search projects..."
            placeholderTextColor={theme.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === cat.id ? theme.primary : theme.surface,
                  borderColor: selectedCategory === cat.id ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <ThemedText
                size="sm"
                style={{ color: selectedCategory === cat.id ? '#FFFFFF' : theme.text }}
              >
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Projects List */}
        <ScrollView
          style={styles.projectsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {projects.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="folder-open" size={48} color={theme.textSecondary} />
              <ThemedText variant="secondary" style={styles.emptyText}>
                No projects found
              </ThemedText>
              <Button
                title="Create a Project"
                onPress={() => router.push('/project/create')}
                variant="outline"
              />
            </Card>
          ) : (
            projects.map((project) => (
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
                  <View style={styles.memberCount}>
                    <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                    <ThemedText variant="secondary" size="xs">
                      {project.current_members}/{project.team_size}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText weight="semibold" size="lg" style={styles.projectTitle}>
                  {project.title}
                </ThemedText>
                
                <ThemedText variant="secondary" size="sm" numberOfLines={2} style={styles.projectDesc}>
                  {project.description}
                </ThemedText>
                
                {project.required_skills.length > 0 && (
                  <View style={styles.skillsRow}>
                    {project.required_skills.slice(0, 4).map((skill, idx) => (
                      <SkillBadge key={idx} name={skill} variant="outline" />
                    ))}
                    {project.required_skills.length > 4 && (
                      <ThemedText variant="tertiary" size="sm">
                        +{project.required_skills.length - 4} more
                      </ThemedText>
                    )}
                  </View>
                )}

                <View style={styles.projectFooter}>
                  <View style={styles.ownerInfo}>
                    <View style={[styles.ownerAvatar, { backgroundColor: theme.primary }]}>
                      <ThemedText style={{ color: '#FFF' }} size="xs" weight="bold">
                        {project.owner?.name?.charAt(0) || 'U'}
                      </ThemedText>
                    </View>
                    <ThemedText variant="secondary" size="sm">
                      {project.owner?.name}
                    </ThemedText>
                  </View>
                  {project.deadline && (
                    <View style={styles.deadline}>
                      <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                      <ThemedText variant="secondary" size="xs">
                        {project.deadline}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/project/create')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginTop: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  projectsList: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
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
  projectTitle: {
    marginBottom: 4,
  },
  projectDesc: {
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
