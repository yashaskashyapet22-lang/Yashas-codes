export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  skills: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  availability: 'available' | 'busy' | 'not_available';
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  project_id: string;
  created_by: string;
  title: string;
  description: string;
  required_skills: string[];
  team_size: number;
  category: 'hackathon' | 'startup' | 'learning' | 'side_project';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  current_members: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
  owner?: {
    name: string;
    picture?: string;
    user_id?: string;
  };
}

export interface MatchResult {
  user_id: string;
  name: string;
  skills: string[];
  experience_level: string;
  match_score: number;
  matching_skills: string[];
}

export interface AITeamRecommendation {
  role: string;
  user_id: string;
  name: string;
  reasoning: string;
}

export interface AITeamResponse {
  analysis: string;
  recommendations: AITeamRecommendation[];
  introduction_message: string;
}
