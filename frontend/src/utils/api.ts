import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = await AsyncStorage.getItem('session_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  },

  // Auth
  exchangeSession(sessionId: string) {
    return this.fetch('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  getMe() {
    return this.fetch('/api/auth/me');
  },

  logout() {
    return this.fetch('/api/auth/logout', { method: 'POST' });
  },

  // Users
  getUsers() {
    return this.fetch('/api/users');
  },

  getUser(userId: string) {
    return this.fetch(`/api/users/${userId}`);
  },

  getProfile() {
    return this.fetch('/api/users/profile');
  },

  updateProfile(data: {
    name?: string;
    skills?: string[];
    experience_level?: string;
    availability?: string;
    bio?: string;
  }) {
    return this.fetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  searchUsers(params?: { skills?: string; availability?: string }) {
    const query = new URLSearchParams();
    if (params?.skills) query.set('skills', params.skills);
    if (params?.availability) query.set('availability', params.availability);
    return this.fetch(`/api/users/search?${query.toString()}`);
  },

  // Projects
  getProjects(params?: { category?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return this.fetch(`/api/projects?${query.toString()}`);
  },

  getProject(id: string) {
    return this.fetch(`/api/projects/${id}`);
  },

  createProject(data: {
    title: string;
    description: string;
    required_skills: string[];
    team_size: number;
    category: string;
    deadline?: string;
  }) {
    return this.fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProject(id: string, data: Partial<{
    title: string;
    description: string;
    required_skills: string[];
    team_size: number;
    category: string;
    status: string;
    deadline?: string;
  }>) {
    return this.fetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProject(id: string) {
    return this.fetch(`/api/projects/${id}`, { method: 'DELETE' });
  },

  // Matching
  getMatches(projectId: string) {
    return this.fetch(`/api/match/${projectId}`);
  },

  // AI Team Builder
  buildTeamWithAI(data: { prompt: string; project_id?: string }) {
    return this.fetch('/api/ai/team-builder', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
