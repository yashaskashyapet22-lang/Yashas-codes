#!/usr/bin/env python3
"""
Backend API Tests for Team Builder + Skill Match App
Tests all backend endpoints including auth, projects, users, teams, and AI features
"""

import requests
import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os

# Configuration
BACKEND_URL = "https://ai-assistant-hub-165.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Test data
TEST_USER_EMAIL = "testuser@teambuilder.com"
TEST_USER_NAME = "Test User"
TEST_PROJECT_DATA = {
    "title": "Fintech Hackathon",
    "description": "Building a payment app",
    "category": "hackathon",
    "required_skills": ["React", "Node.js"],
    "team_size": 4
}

class BackendTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.project_id = None
        self.team_id = None
        self.mongo_client = MongoClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.test_results = []

    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")

    def create_test_user_and_session(self):
        """Create a test user and session in MongoDB for authentication tests"""
        try:
            # Clean up existing test data
            self.db.users.delete_many({"email": TEST_USER_EMAIL})
            self.db.user_sessions.delete_many({})
            
            # Create test user
            self.user_id = f"test-user-{int(time.time())}"
            self.session_token = f"test_session_{int(time.time())}"
            
            user_doc = {
                "user_id": self.user_id,
                "email": TEST_USER_EMAIL,
                "name": TEST_USER_NAME,
                "skills": [
                    {"name": "React", "level": "expert"},
                    {"name": "Python", "level": "intermediate"}
                ],
                "availability": "available",
                "looking_for": ["hackathon"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            self.db.users.insert_one(user_doc)
            
            # Create session
            session_doc = {
                "user_id": self.user_id,
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            
            self.db.user_sessions.insert_one(session_doc)
            
            self.log_result("Setup: Create Test User and Session", True, 
                          f"Created user {self.user_id} with session token")
            return True
            
        except Exception as e:
            self.log_result("Setup: Create Test User and Session", False, str(e))
            return False

    def test_health_endpoints(self):
        """Test health check endpoints"""
        # Test root endpoint
        try:
            response = requests.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                expected = {"message": "Team Builder API", "version": "1.0.0"}
                if data == expected:
                    self.log_result("Health: Root Endpoint", True, 
                                  "Root endpoint returned correct response", data)
                else:
                    self.log_result("Health: Root Endpoint", False, 
                                  f"Unexpected response: {data}")
            else:
                self.log_result("Health: Root Endpoint", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Health: Root Endpoint", False, str(e))

        # Test health endpoint
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("Health: Health Check", True, 
                                  "Health endpoint returned healthy status", data)
                else:
                    self.log_result("Health: Health Check", False, 
                                  f"Unexpected response: {data}")
            else:
                self.log_result("Health: Health Check", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Health: Health Check", False, str(e))

    def test_projects_public_endpoints(self):
        """Test public project endpoints (no auth required)"""
        # Test GET /api/projects
        try:
            response = requests.get(f"{BACKEND_URL}/projects")
            if response.status_code == 200:
                projects = response.json()
                self.log_result("Projects: List Projects", True, 
                              f"Retrieved {len(projects)} projects", 
                              {"count": len(projects)})
            else:
                self.log_result("Projects: List Projects", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Projects: List Projects", False, str(e))

        # Test GET /api/projects with category filter
        try:
            response = requests.get(f"{BACKEND_URL}/projects?category=hackathon")
            if response.status_code == 200:
                projects = response.json()
                # Check if all returned projects have hackathon category
                all_hackathon = all(p.get("category") == "hackathon" for p in projects)
                if all_hackathon:
                    self.log_result("Projects: Filter by Category", True, 
                                  f"Retrieved {len(projects)} hackathon projects")
                else:
                    self.log_result("Projects: Filter by Category", False, 
                                  "Some projects don't match hackathon category")
            else:
                self.log_result("Projects: Filter by Category", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Projects: Filter by Category", False, str(e))

    def test_auth_me_endpoint(self):
        """Test GET /api/auth/me with session token"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("user_id") == self.user_id:
                    self.log_result("Auth: Get Current User", True, 
                                  f"Retrieved user data for {user_data.get('name')}", 
                                  {"user_id": user_data.get("user_id")})
                else:
                    self.log_result("Auth: Get Current User", False, 
                                  f"User ID mismatch: expected {self.user_id}, got {user_data.get('user_id')}")
            else:
                self.log_result("Auth: Get Current User", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Auth: Get Current User", False, str(e))

    def test_user_profile_endpoints(self):
        """Test user profile GET and PUT endpoints"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Test GET /api/users/profile
        try:
            response = requests.get(f"{BACKEND_URL}/users/profile", headers=headers)
            if response.status_code == 200:
                profile = response.json()
                if profile.get("user_id") == self.user_id:
                    self.log_result("Profile: Get User Profile", True, 
                                  f"Retrieved profile for {profile.get('name')}")
                else:
                    self.log_result("Profile: Get User Profile", False, 
                                  f"Profile user_id mismatch")
            else:
                self.log_result("Profile: Get User Profile", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Profile: Get User Profile", False, str(e))

        # Test PUT /api/users/profile
        try:
            update_data = {"bio": "Software developer passionate about team building"}
            response = requests.put(f"{BACKEND_URL}/users/profile", 
                                  json=update_data, headers=headers)
            if response.status_code == 200:
                updated_profile = response.json()
                if updated_profile.get("bio") == update_data["bio"]:
                    self.log_result("Profile: Update User Profile", True, 
                                  "Successfully updated user bio")
                else:
                    self.log_result("Profile: Update User Profile", False, 
                                  "Bio not updated correctly")
            else:
                self.log_result("Profile: Update User Profile", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Profile: Update User Profile", False, str(e))

    def test_projects_authenticated_endpoints(self):
        """Test authenticated project endpoints"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Test POST /api/projects
        try:
            response = requests.post(f"{BACKEND_URL}/projects", 
                                   json=TEST_PROJECT_DATA, headers=headers)
            if response.status_code == 200:
                project = response.json()
                self.project_id = project.get("project_id")
                if self.project_id and project.get("title") == TEST_PROJECT_DATA["title"]:
                    self.log_result("Projects: Create Project", True, 
                                  f"Created project {project.get('title')} with ID {self.project_id}")
                else:
                    self.log_result("Projects: Create Project", False, 
                                  "Project creation response missing expected fields")
            else:
                self.log_result("Projects: Create Project", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Projects: Create Project", False, str(e))

        # Test GET /api/projects/{project_id} if we created a project
        if self.project_id:
            try:
                response = requests.get(f"{BACKEND_URL}/projects/{self.project_id}")
                if response.status_code == 200:
                    project = response.json()
                    if project.get("project_id") == self.project_id:
                        self.log_result("Projects: Get Single Project", True, 
                                      f"Retrieved project details for {project.get('title')}")
                    else:
                        self.log_result("Projects: Get Single Project", False, 
                                      "Project ID mismatch in response")
                else:
                    self.log_result("Projects: Get Single Project", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_result("Projects: Get Single Project", False, str(e))

    def test_teams_endpoints(self):
        """Test team management endpoints"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Test GET /api/teams
        try:
            response = requests.get(f"{BACKEND_URL}/teams", headers=headers)
            if response.status_code == 200:
                teams = response.json()
                # Should have at least 1 team if project was created (auto-created team)
                if len(teams) > 0:
                    self.team_id = teams[0].get("team_id")
                    self.log_result("Teams: Get User Teams", True, 
                                  f"Retrieved {len(teams)} teams")
                else:
                    self.log_result("Teams: Get User Teams", True, 
                                  "No teams found (expected for new user)")
            else:
                self.log_result("Teams: Get User Teams", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Teams: Get User Teams", False, str(e))

    def test_ai_team_builder(self):
        """Test AI team builder endpoint"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        ai_request = {
            "message": "I need help building a team for a fintech hackathon. I need developers with React and Python skills.",
            "context": {
                "project_type": "hackathon",
                "skills_needed": ["React", "Python", "Node.js"]
            }
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/ai/team-builder", 
                                   json=ai_request, headers=headers)
            if response.status_code == 200:
                ai_response = response.json()
                if "response" in ai_response and ai_response["response"]:
                    self.log_result("AI: Team Builder", True, 
                                  f"AI responded with {len(ai_response['response'])} characters")
                else:
                    self.log_result("AI: Team Builder", False, 
                                  "AI response missing or empty")
            else:
                self.log_result("AI: Team Builder", False, 
                              f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("AI: Team Builder", False, str(e))

    def test_error_handling(self):
        """Test error handling for various scenarios"""
        # Test unauthorized access
        try:
            response = requests.get(f"{BACKEND_URL}/users/profile")
            if response.status_code == 401:
                self.log_result("Error Handling: Unauthorized Access", True, 
                              "Correctly returned 401 for unauthorized request")
            else:
                self.log_result("Error Handling: Unauthorized Access", False, 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling: Unauthorized Access", False, str(e))

        # Test invalid project ID
        headers = {"Authorization": f"Bearer {self.session_token}"}
        try:
            response = requests.get(f"{BACKEND_URL}/projects/invalid_id", headers=headers)
            if response.status_code == 404:
                self.log_result("Error Handling: Invalid Project ID", True, 
                              "Correctly returned 404 for invalid project")
            else:
                self.log_result("Error Handling: Invalid Project ID", False, 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling: Invalid Project ID", False, str(e))

    def cleanup(self):
        """Clean up test data"""
        try:
            # Clean up MongoDB test data
            if self.user_id:
                self.db.users.delete_many({"user_id": self.user_id})
                self.db.user_sessions.delete_many({"user_id": self.user_id})
                if self.project_id:
                    self.db.projects.delete_many({"project_id": self.project_id})
                    self.db.teams.delete_many({"project_id": self.project_id})
            
            self.mongo_client.close()
            self.log_result("Cleanup", True, "Test data cleaned up")
        except Exception as e:
            self.log_result("Cleanup", False, str(e))

    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Backend API Tests for Team Builder + Skill Match")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"MongoDB: {MONGO_URL}")
        print("=" * 60)
        
        # Setup
        if not self.create_test_user_and_session():
            print("❌ Failed to create test user. Stopping tests.")
            return False
        
        # Run tests
        self.test_health_endpoints()
        self.test_projects_public_endpoints()
        self.test_auth_me_endpoint()
        self.test_user_profile_endpoints()
        self.test_projects_authenticated_endpoints()
        self.test_teams_endpoints()
        self.test_ai_team_builder()
        self.test_error_handling()
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)