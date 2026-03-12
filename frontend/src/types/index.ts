export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  skills: Skill[];
  availability: 'available' | 'busy' | 'not_looking';
  looking_for: string[];
  github_url?: string;
  linkedin_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  project_id: string;
  owner_id: string;
  title: string;
  description: string;
  category: 'hackathon' | 'startup' | 'learning' | 'side_project';
  required_skills: string[];
  team_size: number;
  current_members: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  deadline?: string;
  created_at: string;
  updated_at: string;
  owner?: {
    name: string;
    picture?: string;
    user_id?: string;
  };
  team?: Team;
}

export interface TeamMember {
  user_id: string;
  name: string;
  role: string;
  joined_at: string;
}

export interface Team {
  team_id: string;
  project_id: string;
  name: string;
  members: TeamMember[];
  invite_code: string;
  created_at: string;
  project?: {
    title: string;
    category: string;
    status: string;
  };
}

export interface TeamInvite {
  invite_id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  team?: {
    name: string;
    project_id: string;
  };
  project?: {
    title: string;
  };
  inviter?: {
    name: string;
    picture?: string;
  };
}

export interface AIResponse {
  response: string;
  suggestions?: Array<{
    user_id: string;
    name: string;
    skills: Skill[];
  }>;
  action_required: boolean;
  action_type?: string;
}
