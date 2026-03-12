import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { SkillBadge } from '../../src/components/SkillBadge';
import { useThemeStore, getTheme, ThemeMode } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/utils/api';
import { Skill } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

const SKILL_LEVELS = ['beginner', 'intermediate', 'expert'] as const;

const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available', icon: 'checkmark-circle', color: '#10B981' },
  { id: 'busy', label: 'Busy', icon: 'time', color: '#F59E0B' },
  { id: 'not_looking', label: 'Not Looking', icon: 'close-circle', color: '#EF4444' },
];

export default function Profile() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const { mode, setMode } = useThemeStore();
  const theme = getTheme(isDark);
  const { user, logout } = useAuthStore();
  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<Skill[]>(user?.skills || []);
  const [availability, setAvailability] = useState(user?.availability || 'available');
  const [newSkill, setNewSkill] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<Skill['level']>('intermediate');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

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
    
    const skill: Skill = {
      name: newSkill.trim(),
      level: newSkillLevel,
    };
    setSkills([...skills, skill]);
    setNewSkill('');
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name,
        bio,
        skills,
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

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: '#FFF' }} size="2xl" weight="bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </ThemedText>
          </View>
          {!editing ? (
            <>
              <ThemedText size="xl" weight="bold" style={styles.headerName}>
                {user?.name}
              </ThemedText>
              <ThemedText variant="secondary">{user?.email}</ThemedText>
              <Button
                title="Edit Profile"
                variant="outline"
                size="sm"
                onPress={() => setEditing(true)}
                style={styles.editButton}
              />
            </>
          ) : (
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              containerStyle={styles.nameInput}
            />
          )}
        </View>

        {/* Bio */}
        {editing && (
          <Card style={styles.section}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>Bio</ThemedText>
            <Input
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder="Tell us about yourself..."
            />
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
                onPress={() => editing && setAvailability(option.id as any)}
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
              <SkillBadge
                key={index}
                name={skill.name}
                level={skill.level}
                onRemove={editing ? () => handleRemoveSkill(index) : undefined}
              />
            ))}
          </View>
          
          {editing && (
            <View style={styles.addSkillContainer}>
              <View style={styles.skillInputRow}>
                <Input
                  placeholder="Add a skill"
                  value={newSkill}
                  onChangeText={setNewSkill}
                  containerStyle={styles.skillInput}
                />
                <TouchableOpacity
                  style={[styles.addSkillButton, { backgroundColor: theme.primary }]}
                  onPress={handleAddSkill}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.levelSelector}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelOption,
                      {
                        backgroundColor: newSkillLevel === level ? theme.primary : theme.surface,
                        borderColor: newSkillLevel === level ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setNewSkillLevel(level)}
                  >
                    <ThemedText
                      size="xs"
                      style={{ color: newSkillLevel === level ? '#FFFFFF' : theme.text }}
                    >
                      {level}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Settings */}
        <Card style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>Settings</ThemedText>
          
          {/* Theme */}
          <View style={styles.settingRow}>
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
                  onPress={() => handleThemeChange(themeMode)}
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
        <Button
          title="Logout"
          variant="ghost"
          onPress={handleLogout}
          textStyle={{ color: theme.error }}
          style={styles.logoutButton}
        />

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
  editButton: {
    marginTop: 12,
  },
  nameInput: {
    width: '100%',
    marginTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
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
    marginBottom: 12,
  },
  addSkillContainer: {
    gap: 8,
  },
  skillInputRow: {
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
  levelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  levelOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
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
    marginTop: 8,
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
});
