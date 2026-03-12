import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useThemeStore, getTheme, ThemeMode } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];

const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available', icon: 'checkmark-circle', color: '#10B981' },
  { id: 'busy', label: 'Busy', icon: 'time', color: '#F59E0B' },
  { id: 'not_available', label: 'Not Available', icon: 'close-circle', color: '#EF4444' },
];

export default function Profile() {
  const isDark = useThemeStore((state) => state.isDark);
  const { mode, setMode } = useThemeStore();
  const theme = getTheme(isDark);
  const { user, logout } = useAuthStore();
  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [experienceLevel, setExperienceLevel] = useState(user?.experience_level || 'beginner');
  const [availability, setAvailability] = useState(user?.availability || 'available');
  const [newSkill, setNewSkill] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setSkills(user.skills || []);
      setExperienceLevel(user.experience_level || 'beginner');
      setAvailability(user.availability || 'available');
    }
  }, [user]);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
      });
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric login enabled!');
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (skills.includes(newSkill.trim())) {
      Alert.alert('Error', 'Skill already added');
      return;
    }
    setSkills([...skills, newSkill.trim()]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name,
        bio,
        skills,
        experience_level: experienceLevel,
        availability,
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={{ color: '#FFF' }} size="2xl" weight="bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </ThemedText>
          </LinearGradient>
          
          {!editing ? (
            <>
              <ThemedText size="2xl" weight="bold" style={styles.headerName}>
                {user?.name}
              </ThemedText>
              <ThemedText variant="secondary">{user?.email}</ThemedText>
              <View style={[styles.levelBadge, { backgroundColor: theme.primary + '20' }]}>
                <ThemedText style={{ color: theme.primary }} size="sm" weight="medium">
                  {user?.experience_level?.charAt(0).toUpperCase()}{user?.experience_level?.slice(1)}
                </ThemedText>
              </View>
              <Button
                title="Edit Profile"
                variant="outline"
                size="sm"
                onPress={() => setEditing(true)}
                style={styles.editButton}
              />
            </>
          ) : (
            <View style={styles.editNameContainer}>
              <ThemedText variant="secondary" size="sm" style={styles.label}>Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          )}
        </View>

        {/* Bio */}
        {editing && (
          <Card style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Bio</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.textTertiary}
              textAlignVertical="top"
            />
          </Card>
        )}

        {/* Experience Level */}
        {editing && (
          <Card style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Experience Level</ThemedText>
            <View style={styles.experienceOptions}>
              {EXPERIENCE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.experienceOption,
                    {
                      backgroundColor: experienceLevel === level ? theme.primary : theme.surface,
                      borderColor: experienceLevel === level ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setExperienceLevel(level)}
                >
                  <ThemedText
                    size="sm"
                    style={{ color: experienceLevel === level ? '#FFFFFF' : theme.text }}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Availability */}
        <Card style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>Availability</ThemedText>
          <View style={styles.availabilityOptions}>
            {AVAILABILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.availabilityOption,
                  {
                    backgroundColor: availability === option.id ? option.color + '20' : theme.surface,
                    borderColor: availability === option.id ? option.color : theme.border,
                  },
                ]}
                onPress={() => editing && setAvailability(option.id)}
                disabled={!editing}
              >
                <Ionicons name={option.icon as any} size={24} color={option.color} />
                <ThemedText size="sm">{option.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Skills */}
        <Card style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>Skills</ThemedText>
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <View 
                key={index} 
                style={[styles.skillBadge, { backgroundColor: theme.surfaceVariant }]}
              >
                <ThemedText size="sm">{skill}</ThemedText>
                {editing && (
                  <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          
          {editing && (
            <View style={styles.addSkillContainer}>
              <TextInput
                style={[styles.skillInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="Add a skill (e.g., React, Python)"
                placeholderTextColor={theme.textTertiary}
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={handleAddSkill}
              />
              <TouchableOpacity
                style={styles.addSkillButton}
                onPress={handleAddSkill}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.addSkillGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Settings */}
        <Card style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>Settings</ThemedText>
          
          {/* Theme */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="color-palette" size={24} color={theme.textSecondary} />
              <ThemedText>Theme</ThemedText>
            </View>
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((themeMode) => (
                <TouchableOpacity
                  key={themeMode}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: mode === themeMode ? theme.primary : theme.surface,
                      borderColor: mode === themeMode ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setMode(themeMode)}
                >
                  <Ionicons
                    name={
                      themeMode === 'light' ? 'sunny' : themeMode === 'dark' ? 'moon' : 'phone-portrait'
                    }
                    size={16}
                    color={mode === themeMode ? '#FFFFFF' : theme.text}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Biometrics */}
          {biometricAvailable && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="finger-print" size={24} color={theme.textSecondary} />
                <ThemedText>Biometric Login</ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          )}
        </Card>

        {/* Save/Cancel Buttons */}
        {editing && (
          <View style={styles.actionButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setEditing(false);
                setName(user?.name || '');
                setBio(user?.bio || '');
                setSkills(user?.skills || []);
                setExperienceLevel(user?.experience_level || 'beginner');
                setAvailability(user?.availability || 'available');
              }}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <ThemedText style={{ color: theme.error }}>Logout</ThemedText>
        </TouchableOpacity>

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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerName: {
    marginBottom: 4,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  editButton: {
    marginTop: 12,
  },
  editNameContainer: {
    width: '100%',
    marginTop: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
  },
  experienceOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  experienceOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  availabilityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  addSkillContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addSkillButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addSkillGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
});
