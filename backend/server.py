from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Models ==============

class Skill(BaseModel):
    name: str
    level: str = "intermediate"  # beginner, intermediate, expert

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    skills: List[Skill] = []
    availability: str = "available"  # available, busy, not_looking
    looking_for: List[str] = []  # types of projects looking for
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[Skill]] = None
    availability: Optional[str] = None
    looking_for: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class Project(BaseModel):
    project_id: str = Field(default_factory=lambda: f"proj_{uuid.uuid4().hex[:12]}")
    owner_id: str
    title: str
    description: str
    category: str  # hackathon, startup, learning, side_project
    required_skills: List[str] = []
    team_size: int = 4
    current_members: int = 1
    status: str = "open"  # open, in_progress, completed, cancelled
    deadline: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    title: str
    description: str
    category: str
    required_skills: List[str] = []
    team_size: int = 4
    deadline: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    required_skills: Optional[List[str]] = None
    team_size: Optional[int] = None
    status: Optional[str] = None
    deadline: Optional[str] = None

class TeamMember(BaseModel):
    user_id: str
    name: str
    role: str
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Team(BaseModel):
    team_id: str = Field(default_factory=lambda: f"team_{uuid.uuid4().hex[:12]}")
    project_id: str
    name: str
    members: List[TeamMember] = []
    invite_code: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamInvite(BaseModel):
    invite_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    team_id: str
    inviter_id: str
    invitee_id: str
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, declined
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class AIResponse(BaseModel):
    response: str
    suggestions: Optional[List[dict]] = None
    action_required: bool = False
    action_type: Optional[str] = None

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== Auth Helpers ==============

async def get_current_user(request: Request) -> UserProfile:
    """Get current user from session token"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(**user_doc)

# ============== Auth Routes ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        user_data = auth_response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    email = user_data.get("email")
    name = user_data.get("name")
    picture = user_data.get("picture")
    session_token = user_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": name,
                "picture": picture,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        # Create new user
        new_user = UserProfile(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture
        )
        await db.users.insert_one(new_user.model_dump())
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Insert new session
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: UserProfile = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}

# ============== User Routes ==============

@api_router.get("/users/profile")
async def get_profile(user: UserProfile = Depends(get_current_user)):
    """Get current user's profile"""
    return user.model_dump()

@api_router.put("/users/profile")
async def update_profile(
    update: UserProfileUpdate,
    user: UserProfile = Depends(get_current_user)
):
    """Update user profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    if update_data.get("skills"):
        update_data["skills"] = [s.model_dump() if isinstance(s, Skill) else s for s in update_data["skills"]]
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

@api_router.get("/users/search")
async def search_users(
    skills: Optional[str] = None,
    availability: Optional[str] = None,
    limit: int = 20,
    user: UserProfile = Depends(get_current_user)
):
    """Search users by skills and availability"""
    query = {}
    
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        query["skills.name"] = {"$regex": "|".join(skill_list), "$options": "i"}
    
    if availability:
        query["availability"] = availability
    
    users = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return users

# ============== Project Routes ==============

@api_router.get("/projects")
async def get_projects(
    category: Optional[str] = None,
    status: Optional[str] = None,
    skills: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get all projects with optional filters"""
    query = {}
    
    if category:
        query["category"] = category
    
    if status:
        query["status"] = status
    else:
        query["status"] = "open"  # Default to open projects
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        query["required_skills"] = {"$in": skill_list}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with owner info
    for project in projects:
        owner = await db.users.find_one({"user_id": project["owner_id"]}, {"_id": 0, "name": 1, "picture": 1})
        project["owner"] = owner
    
    return projects

@api_router.post("/projects")
async def create_project(
    project: ProjectCreate,
    user: UserProfile = Depends(get_current_user)
):
    """Create a new project"""
    new_project = Project(
        owner_id=user.user_id,
        **project.model_dump()
    )
    
    await db.projects.insert_one(new_project.model_dump())
    
    # Auto-create team for the project
    team = Team(
        project_id=new_project.project_id,
        name=f"Team {project.title}",
        members=[TeamMember(
            user_id=user.user_id,
            name=user.name,
            role="Owner"
        )]
    )
    await db.teams.insert_one(team.model_dump())
    
    return new_project.model_dump()

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a single project by ID"""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get owner info
    owner = await db.users.find_one({"user_id": project["owner_id"]}, {"_id": 0, "name": 1, "picture": 1, "user_id": 1})
    project["owner"] = owner
    
    # Get team info
    team = await db.teams.find_one({"project_id": project_id}, {"_id": 0})
    project["team"] = team
    
    return project

@api_router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    user: UserProfile = Depends(get_current_user)
):
    """Update a project"""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    
    updated_project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    return updated_project

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """Delete a project"""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.projects.delete_one({"project_id": project_id})
    await db.teams.delete_many({"project_id": project_id})
    
    return {"message": "Project deleted successfully"}

# ============== Team Routes ==============

@api_router.get("/teams")
async def get_user_teams(user: UserProfile = Depends(get_current_user)):
    """Get teams the user is a member of"""
    teams = await db.teams.find(
        {"members.user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with project info
    for team in teams:
        project = await db.projects.find_one({"project_id": team["project_id"]}, {"_id": 0, "title": 1, "category": 1, "status": 1})
        team["project"] = project
    
    return teams

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str, user: UserProfile = Depends(get_current_user)):
    """Get a single team"""
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    project = await db.projects.find_one({"project_id": team["project_id"]}, {"_id": 0})
    team["project"] = project
    
    return team

@api_router.post("/teams/{team_id}/join")
async def join_team_by_code(
    team_id: str,
    request: Request,
    user: UserProfile = Depends(get_current_user)
):
    """Join a team using invite code"""
    body = await request.json()
    invite_code = body.get("invite_code")
    
    team = await db.teams.find_one({"team_id": team_id, "invite_code": invite_code}, {"_id": 0})
    
    if not team:
        raise HTTPException(status_code=404, detail="Invalid team or invite code")
    
    # Check if already a member
    if any(m["user_id"] == user.user_id for m in team.get("members", [])):
        raise HTTPException(status_code=400, detail="Already a team member")
    
    # Add to team
    new_member = TeamMember(
        user_id=user.user_id,
        name=user.name,
        role="Member"
    )
    
    await db.teams.update_one(
        {"team_id": team_id},
        {"$push": {"members": new_member.model_dump()}}
    )
    
    # Update project member count
    await db.projects.update_one(
        {"project_id": team["project_id"]},
        {"$inc": {"current_members": 1}}
    )
    
    return {"message": "Joined team successfully"}

@api_router.post("/teams/{team_id}/invite")
async def send_invite(
    team_id: str,
    request: Request,
    user: UserProfile = Depends(get_current_user)
):
    """Send a team invite"""
    body = await request.json()
    invitee_id = body.get("invitee_id")
    message = body.get("message")
    
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is a team member
    if not any(m["user_id"] == user.user_id for m in team.get("members", [])):
        raise HTTPException(status_code=403, detail="Not a team member")
    
    # Create invite
    invite = TeamInvite(
        team_id=team_id,
        inviter_id=user.user_id,
        invitee_id=invitee_id,
        message=message
    )
    
    await db.team_invites.insert_one(invite.model_dump())
    
    return invite.model_dump()

@api_router.get("/invites")
async def get_invites(user: UserProfile = Depends(get_current_user)):
    """Get pending invites for user"""
    invites = await db.team_invites.find(
        {"invitee_id": user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with team and inviter info
    for invite in invites:
        team = await db.teams.find_one({"team_id": invite["team_id"]}, {"_id": 0, "name": 1, "project_id": 1})
        invite["team"] = team
        
        if team:
            project = await db.projects.find_one({"project_id": team["project_id"]}, {"_id": 0, "title": 1})
            invite["project"] = project
        
        inviter = await db.users.find_one({"user_id": invite["inviter_id"]}, {"_id": 0, "name": 1, "picture": 1})
        invite["inviter"] = inviter
    
    return invites

@api_router.post("/invites/{invite_id}/respond")
async def respond_to_invite(
    invite_id: str,
    request: Request,
    user: UserProfile = Depends(get_current_user)
):
    """Accept or decline an invite"""
    body = await request.json()
    action = body.get("action")  # accept or decline
    
    invite = await db.team_invites.find_one(
        {"invite_id": invite_id, "invitee_id": user.user_id},
        {"_id": 0}
    )
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if action == "accept":
        # Add to team
        new_member = TeamMember(
            user_id=user.user_id,
            name=user.name,
            role="Member"
        )
        
        await db.teams.update_one(
            {"team_id": invite["team_id"]},
            {"$push": {"members": new_member.model_dump()}}
        )
        
        # Get team to update project
        team = await db.teams.find_one({"team_id": invite["team_id"]}, {"_id": 0})
        if team:
            await db.projects.update_one(
                {"project_id": team["project_id"]},
                {"$inc": {"current_members": 1}}
            )
    
    # Update invite status
    await db.team_invites.update_one(
        {"invite_id": invite_id},
        {"$set": {"status": "accepted" if action == "accept" else "declined"}}
    )
    
    return {"message": f"Invite {action}ed successfully"}

# ============== AI Team Builder Routes ==============

@api_router.post("/ai/team-builder")
async def ai_team_builder(
    ai_request: AIRequest,
    user: UserProfile = Depends(get_current_user)
):
    """AI-powered team building assistant"""
    
    # Get available users for matching
    available_users = await db.users.find(
        {"availability": "available", "user_id": {"$ne": user.user_id}},
        {"_id": 0}
    ).limit(50).to_list(50)
    
    # Get user's projects
    user_projects = await db.projects.find(
        {"owner_id": user.user_id},
        {"_id": 0}
    ).to_list(10)
    
    # Build context for AI
    context = ai_request.context or {}
    context["available_users"] = [
        {
            "user_id": u["user_id"],
            "name": u["name"],
            "skills": u.get("skills", []),
            "bio": u.get("bio", "")
        }
        for u in available_users
    ]
    context["user_projects"] = user_projects
    context["current_user"] = {
        "name": user.name,
        "skills": [s.model_dump() if isinstance(s, Skill) else s for s in user.skills]
    }
    
    # Create AI chat
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"team_builder_{user.user_id}_{uuid.uuid4().hex[:8]}",
        system_message="""You are an AI Team Building Assistant for a student collaboration platform. Your role is to help users build effective teams for hackathons, startups, and projects.

When a user asks for help:
1. Analyze their requirements (skills needed, project type, team size)
2. Search through available users to find the best matches
3. Explain WHY each person would be a good fit
4. Suggest role distributions
5. Offer to draft introduction messages

Always be helpful, professional, and explain your reasoning. If you suggest actions like sending invites or messages, always ask for user confirmation first.

Format your responses clearly with:
- Match suggestions with explanations
- Role recommendations
- Next steps the user can take

Available users and context will be provided in each message."""
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    # Create message with context
    message_text = f"""User Request: {ai_request.message}

Context:
- Available team members: {len(context['available_users'])} users
- User's current projects: {len(context['user_projects'])} projects

Available Users:
{chr(10).join([f"- {u['name']}: Skills: {', '.join([s.get('name', s) if isinstance(s, dict) else s for s in u['skills']])}" for u in context['available_users'][:10]])}

Please help the user with their team building request."""

    user_message = UserMessage(text=message_text)
    
    try:
        response = await chat.send_message(user_message)
        
        # Parse response to extract suggestions
        suggestions = []
        action_required = False
        action_type = None
        
        # Check if response suggests actions
        if "send" in response.lower() and ("message" in response.lower() or "invite" in response.lower()):
            action_required = True
            action_type = "send_invite"
        
        # Extract mentioned users as suggestions
        for u in context["available_users"]:
            if u["name"].lower() in response.lower():
                suggestions.append({
                    "user_id": u["user_id"],
                    "name": u["name"],
                    "skills": u["skills"]
                })
        
        return AIResponse(
            response=response,
            suggestions=suggestions if suggestions else None,
            action_required=action_required,
            action_type=action_type
        )
        
    except Exception as e:
        logger.error(f"AI error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.post("/ai/draft-message")
async def ai_draft_message(
    request: Request,
    user: UserProfile = Depends(get_current_user)
):
    """AI drafts an introduction message"""
    body = await request.json()
    recipient_id = body.get("recipient_id")
    project_title = body.get("project_title")
    role = body.get("role")
    
    # Get recipient info
    recipient = await db.users.find_one({"user_id": recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"draft_{user.user_id}_{uuid.uuid4().hex[:8]}",
        system_message="You are a helpful assistant that drafts professional but friendly introduction messages for team collaboration requests. Keep messages concise and personalized."
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    message_text = f"""Draft a brief introduction message from {user.name} to {recipient['name']} inviting them to join a project.

Project: {project_title}
Proposed Role: {role}
Sender's skills: {', '.join([s.name if isinstance(s, Skill) else s.get('name', '') for s in user.skills])}
Recipient's skills: {', '.join([s.get('name', s) if isinstance(s, dict) else s for s in recipient.get('skills', [])])}

Keep it friendly, professional, and under 100 words."""

    user_message = UserMessage(text=message_text)
    
    try:
        response = await chat.send_message(user_message)
        return {"draft_message": response}
    except Exception as e:
        logger.error(f"AI draft error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ============== Health Check ==============

@api_router.get("/")
async def root():
    return {"message": "Team Builder API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
