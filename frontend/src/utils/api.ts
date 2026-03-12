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

  // Projects
  getProjects(params?: { category?: string; status?: string; skills?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.skills) query.set('skills', params.skills);
    if (params?.search) query.set('search', params.search);
    return this.fetch(`/api/projects?${query.toString()}`);
  },

  getProject(id: string) {
    return this.fetch(`/api/projects/${id}`);
  },

  createProject(data: {
    title: string;
    description: string;
    category: string;
    required_skills: string[];
    team_size: number;
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
    category: string;
    required_skills: string[];
    team_size: number;
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

  // Users
  getProfile() {
    return this.fetch('/api/users/profile');
  },

  updateProfile(data: {
    name?: string;
    bio?: string;
    skills?: Array<{ name: string; level: string }>;
    availability?: string;
    looking_for?: string[];
    github_url?: string;
    linkedin_url?: string;
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

  // Teams
  getTeams() {
    return this.fetch('/api/teams');
  },

  getTeam(id: string) {
    return this.fetch(`/api/teams/${id}`);
  },

  joinTeam(teamId: string, inviteCode: string) {
    return this.fetch(`/api/teams/${teamId}/join`, {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  },

  sendInvite(teamId: string, inviteeId: string, message?: string) {
    return this.fetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ invitee_id: inviteeId, message }),
    });
  },

  // Invites
  getInvites() {
    return this.fetch('/api/invites');
  },

  respondToInvite(inviteId: string, action: 'accept' | 'decline') {
    return this.fetch(`/api/invites/${inviteId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // AI
  aiTeamBuilder(message: string, context?: Record<string, unknown>) {
    return this.fetch('/api/ai/team-builder', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  },

  aiDraftMessage(recipientId: string, projectTitle: string, role: string) {
    return this.fetch('/api/ai/draft-message', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        project_title: projectTitle,
        role,
      }),
    });
  },
};
