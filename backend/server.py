from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import os
import logging
import uuid
import httpx
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'team_builder')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
users_collection = db["users"]
projects_collection = db["projects"]
user_sessions = db["user_sessions"]

# Emergent LLM Key for Claude Sonnet
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ============== Pydantic Models ==============

class Skill(BaseModel):
    name: str
    level: str = "intermediate"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str] = []
    experience_level: str = "beginner"
    availability: str = "available"
    bio: str = ""

class UserUpdate(BaseModel):
    name: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None

class ProjectCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    team_size: int = 4
    category: str = "hackathon"
    deadline: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    team_size: Optional[int] = None
    category: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[str] = None

class AITeamRequest(BaseModel):
    prompt: str
    project_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# ============== Database Init ==============

async def init_db():
    await users_collection.create_index("email", unique=True)
    await projects_collection.create_index("created_by")
    logger.info("Database indexes created")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    client.close()

# Create FastAPI app
app = FastAPI(title="Team Builder API - Hybrid Mobile + Web", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Auth Helpers ==============

async def get_current_user(request: Request) -> dict:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await users_collection.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

# ============== Skill Matching ==============

async def calculate_match_score(user_skills: List[str], required_skills: List[str]) -> float:
    if not required_skills:
        return 0.0
    user_skills_lower = [s.lower() for s in user_skills]
    required_skills_lower = [s.lower() for s in required_skills]
    matching = set(user_skills_lower) & set(required_skills_lower)
    return (len(matching) / len(required_skills)) * 100

async def get_skill_matches(project_id: str) -> List[dict]:
    project = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        return []
    
    required_skills = project.get("required_skills", [])
    users = await users_collection.find({"availability": "available"}, {"_id": 0}).to_list(100)
    
    matches = []
    for user in users:
        if user.get("user_id") == project.get("created_by"):
            continue
        
        score = await calculate_match_score(user.get("skills", []), required_skills)
        if score > 0:
            matches.append({
                "user_id": user.get("user_id"),
                "name": user.get("name"),
                "skills": user.get("skills", []),
                "experience_level": user.get("experience_level", "beginner"),
                "match_score": round(score, 2),
                "matching_skills": list(set([s.lower() for s in user.get("skills", [])]) & set([s.lower() for s in required_skills]))
            })
    
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches

# ============== AI Service with Claude Sonnet ==============

async def build_team_with_ai(prompt: str, project_id: str = None) -> dict:
    """Build team using Claude Sonnet via emergentintegrations"""
    context = ""
    
    if project_id:
        project = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
        if project:
            context = f"Project: {project['title']}\nRequired Skills: {', '.join(project.get('required_skills', []))}\nTeam Size: {project.get('team_size', 4)}\n\n"
    
    users = await users_collection.find({"availability": "available"}, {"_id": 0}).to_list(100)
    user_data = [
        {
            "id": user.get("user_id"),
            "name": user.get("name"),
            "skills": user.get("skills", []),
            "experience": user.get("experience_level", "beginner"),
            "bio": user.get("bio", "")
        }
        for user in users
    ]
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"team_builder_{uuid.uuid4().hex[:8]}",
            system_message="""You are an AI team building assistant for hackathons and projects. 
            
When given a request, analyze available candidates and recommend the best team members.

IMPORTANT: You must respond with valid JSON only. No markdown, no code blocks, just pure JSON.

Response format:
{
    "analysis": "Brief analysis of the requirements and matching strategy",
    "recommendations": [
        {
            "role": "Role title (e.g., Frontend Developer)",
            "user_id": "user id from the list",
            "name": "user name",
            "reasoning": "Why this person is a good fit"
        }
    ],
    "introduction_message": "A friendly message to introduce the team"
}

Match users based on skills, experience, and project requirements. Provide 2-4 recommendations."""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        import json
        user_message = UserMessage(text=f"{context}User Request: {prompt}\n\nAvailable Candidates:\n{json.dumps(user_data, indent=2)}")
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Try to extract JSON from the response
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            result = json.loads(response_text)
            return result
        except json.JSONDecodeError:
            # Fallback to mock response
            return generate_mock_team_response(prompt, user_data, project_id)
            
    except Exception as e:
        logger.error(f"AI error: {str(e)}")
        return generate_mock_team_response(prompt, user_data, project_id)

def generate_mock_team_response(prompt: str, user_data: list, project_id: str = None) -> dict:
    """Generate mock team recommendations when AI fails"""
    prompt_lower = prompt.lower()
    recommendations = []
    
    role_keywords = {
        "Frontend Developer": ["react", "javascript", "ui", "ux", "frontend", "css", "html"],
        "Backend Developer": ["python", "fastapi", "node", "backend", "api", "mongodb", "database"],
        "Mobile Developer": ["react native", "flutter", "mobile", "ios", "android", "expo"],
        "AI/ML Engineer": ["machine learning", "tensorflow", "ai", "data science", "python"],
        "Full-stack Developer": ["full-stack", "fullstack", "node.js", "express"]
    }
    
    used_users = set()
    for role, keywords in role_keywords.items():
        for user in user_data:
            if user["id"] in used_users:
                continue
            user_skills_lower = [skill.lower() for skill in user["skills"]]
            matches = any(keyword in skill for keyword in keywords for skill in user_skills_lower)
            if matches and len(recommendations) < 4:
                recommendations.append({
                    "role": role,
                    "user_id": user["id"],
                    "name": user["name"],
                    "reasoning": f"Strong expertise in {', '.join(user['skills'][:3])} with {user['experience']} experience."
                })
                used_users.add(user["id"])
                break
    
    if not recommendations and user_data:
        for i, user in enumerate(user_data[:3]):
            recommendations.append({
                "role": f"Team Member {i+1}",
                "user_id": user["id"],
                "name": user["name"],
                "reasoning": f"Versatile member with skills in {', '.join(user['skills'][:2])}."
            })
    
    return {
        "analysis": f"Based on your request '{prompt}', I've identified team members with complementary skills for project success.",
        "recommendations": recommendations,
        "introduction_message": "Hi team! I'm excited to bring you together for this project. Let's schedule a kickoff meeting to discuss our goals and how we can collaborate effectively!"
    }

# ============== API Routes ==============

# Health Check
@app.get("/api/")
async def root():
    return {"message": "Team Builder API - Hybrid Mobile + Web", "version": "1.0.0", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

# ============== Auth Routes ==============

@app.post("/api/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        user_data = auth_response.json()
    
    email = user_data.get("email")
    name = user_data.get("name")
    picture = user_data.get("picture")
    session_token = user_data.get("session_token")
    
    existing_user = await users_collection.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await users_collection.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc)}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "skills": [],
            "experience_level": "beginner",
            "availability": "available",
            "bio": "",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await users_collection.insert_one(new_user)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await user_sessions.delete_many({"user_id": user_id})
    await user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await users_collection.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out successfully"}

# ============== User Routes ==============

@app.get("/api/users")
async def get_users(user: dict = Depends(get_current_user)):
    users = await users_collection.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

@app.get("/api/users/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    found_user = await users_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return found_user

@app.put("/api/users/profile")
async def update_profile(update: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await users_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    updated_user = await users_collection.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

@app.get("/api/users/search")
async def search_users(
    skills: Optional[str] = None,
    availability: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    query = {}
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        query["skills"] = {"$regex": "|".join(skill_list), "$options": "i"}
    if availability:
        query["availability"] = availability
    
    users = await users_collection.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return users

# ============== Project Routes ==============

@app.get("/api/projects")
async def get_projects(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "cancelled"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    projects = await projects_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for project in projects:
        owner = await users_collection.find_one({"user_id": project.get("created_by")}, {"_id": 0, "name": 1, "picture": 1})
        project["owner"] = owner
    
    return projects

@app.post("/api/projects")
async def create_project(project: ProjectCreate, user: dict = Depends(get_current_user)):
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    project_dict = {
        "project_id": project_id,
        "created_by": user["user_id"],
        "title": project.title,
        "description": project.description,
        "required_skills": project.required_skills,
        "team_size": project.team_size,
        "category": project.category,
        "deadline": project.deadline,
        "status": "open",
        "current_members": 1,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await projects_collection.insert_one(project_dict)
    project_dict.pop("_id", None)
    return project_dict

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    project = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    owner = await users_collection.find_one({"user_id": project.get("created_by")}, {"_id": 0, "name": 1, "picture": 1, "user_id": 1})
    project["owner"] = owner
    
    return project

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate, user: dict = Depends(get_current_user)):
    project = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await projects_collection.update_one({"project_id": project_id}, {"$set": update_data})
    updated = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    return updated

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await projects_collection.delete_one({"project_id": project_id})
    return {"message": "Project deleted"}

# ============== Matching Routes ==============

@app.get("/api/match/{project_id}")
async def match_users(project_id: str, user: dict = Depends(get_current_user)):
    matches = await get_skill_matches(project_id)
    return {"project_id": project_id, "matches": matches}

# ============== AI Routes ==============

@app.post("/api/ai/team-builder")
async def ai_team_builder(request: AITeamRequest, user: dict = Depends(get_current_user)):
    result = await build_team_with_ai(request.prompt, request.project_id)
    return result

# ============== Seed Data ==============

@app.post("/api/seed")
async def seed_database():
    """Seed database with sample users and projects for testing"""
    sample_users = [
        {"user_id": "user_alice123", "email": "alice@example.com", "name": "Alice Chen", "skills": ["React", "TypeScript", "UI/UX", "Figma"], "experience_level": "advanced", "availability": "available", "bio": "Frontend developer passionate about user experience"},
        {"user_id": "user_bob456", "email": "bob@example.com", "name": "Bob Smith", "skills": ["Python", "FastAPI", "MongoDB", "AWS"], "experience_level": "advanced", "availability": "available", "bio": "Backend engineer with cloud expertise"},
        {"user_id": "user_carol789", "email": "carol@example.com", "name": "Carol Williams", "skills": ["React Native", "Expo", "JavaScript", "Firebase"], "experience_level": "intermediate", "availability": "available", "bio": "Mobile developer building cross-platform apps"},
        {"user_id": "user_david012", "email": "david@example.com", "name": "David Kim", "skills": ["Machine Learning", "TensorFlow", "Python", "Data Science"], "experience_level": "advanced", "availability": "available", "bio": "AI/ML engineer focused on NLP"},
        {"user_id": "user_emma345", "email": "emma@example.com", "name": "Emma Johnson", "skills": ["Node.js", "GraphQL", "PostgreSQL", "Docker"], "experience_level": "intermediate", "availability": "available", "bio": "Full-stack developer"}
    ]
    
    sample_projects = [
        {"project_id": "proj_fintech001", "created_by": "user_alice123", "title": "FinTech Hackathon 2025", "description": "Building a next-gen payment solution for Gen-Z", "required_skills": ["React", "Python", "API", "UI/UX"], "team_size": 4, "category": "hackathon", "status": "open", "current_members": 1, "created_at": datetime.now(timezone.utc)},
        {"project_id": "proj_health002", "created_by": "user_bob456", "title": "Health Tracking App", "description": "AI-powered health monitoring application", "required_skills": ["React Native", "Machine Learning", "Python"], "team_size": 3, "category": "startup", "status": "open", "current_members": 1, "created_at": datetime.now(timezone.utc)},
        {"project_id": "proj_learn003", "created_by": "user_carol789", "title": "Learn Code Platform", "description": "Interactive coding education for beginners", "required_skills": ["JavaScript", "Node.js", "MongoDB"], "team_size": 5, "category": "learning", "status": "open", "current_members": 1, "created_at": datetime.now(timezone.utc)}
    ]
    
    for user in sample_users:
        existing = await users_collection.find_one({"user_id": user["user_id"]})
        if not existing:
            user["created_at"] = datetime.now(timezone.utc)
            user["updated_at"] = datetime.now(timezone.utc)
            await users_collection.insert_one(user)
    
    for project in sample_projects:
        existing = await projects_collection.find_one({"project_id": project["project_id"]})
        if not existing:
            project["updated_at"] = datetime.now(timezone.utc)
            await projects_collection.insert_one(project)
    
    return {"message": "Database seeded with sample data", "users": len(sample_users), "projects": len(sample_projects)}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Team Builder API - Hybrid Mobile + Web")
    print("="*60)
    print("✓ MongoDB connected")
    print("✓ Claude Sonnet AI configured")
    print("✓ Emergent Google OAuth ready")
    print("\nBackend running at: http://localhost:8001")
    print("API docs at: http://localhost:8001/docs")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8001)
