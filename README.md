# Team Builder + Skill Match - Hybrid Mobile & Web App

A sophisticated hybrid mobile application with web interface for students to find teammates and build project teams. Based on the [MICROLAND](https://github.com/Pratiklakkundi/MICROLAND) repository, converted to Expo React Native for cross-platform support.

## 🚀 Features

### Native Mobile Capabilities
- 🔐 **Biometric Login** - Fingerprint/Face ID authentication
- 🎨 **Theme Support** - Light/Dark/System theme modes
- 👤 **User Profile Management** - Skills, availability, experience level
- 📴 **Offline-Ready** - AsyncStorage for local caching

### Web Layer (Main Interface)
- 📱 **Tab Navigation** - Home, Projects, AI Builder, Profile
- 🔍 **Project Search & Filters** - By category, skills, search text
- 📝 **Project CRUD** - Create, view, edit, delete projects
- 👥 **Team Management** - View matched users, skill scores

### Agentic AI (Claude Sonnet)
- 🤖 **AI Team Builder** - Natural language team building assistant
- 💡 **Smart Matching** - AI suggests teammates based on skills
- ✉️ **Draft Messages** - AI drafts introduction messages
- ✅ **Trust & Control** - AI explains reasoning, user approves actions

### Authentication
- 🔑 **Google OAuth** - Emergent-based social login

## 🛠️ Tech Stack

- **Frontend**: Expo React Native, TypeScript, Zustand, Expo Router
- **Backend**: FastAPI, MongoDB, Motor (async)
- **AI**: Claude Sonnet via emergentintegrations
- **Auth**: Emergent Google OAuth
- **Styling**: React Native StyleSheet, LinearGradient

## 📁 Project Structure

```
├── backend/
│   ├── .env                    # Environment variables
│   ├── requirements.txt        # Python dependencies
│   └── server.py              # FastAPI server
│
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx    # Tab navigation
│   │   │   ├── index.tsx      # Home dashboard
│   │   │   ├── projects.tsx   # Projects list
│   │   │   ├── ai-builder.tsx # AI team builder
│   │   │   └── profile.tsx    # User profile
│   │   ├── auth/
│   │   │   ├── login.tsx      # Login screen
│   │   │   └── callback.tsx   # OAuth callback
│   │   ├── project/
│   │   │   ├── [id].tsx       # Project details
│   │   │   └── create.tsx     # Create project
│   │   ├── _layout.tsx        # Root layout
│   │   └── index.tsx          # Entry point
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── stores/           # Zustand state stores
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # API helpers
│   ├── app.json              # Expo config
│   ├── package.json          # npm dependencies
│   └── tsconfig.json         # TypeScript config
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and API keys

# Run server
uvicorn server:app --reload --port 8001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Start development server
expo start
```

### Environment Variables

**backend/.env**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="team_builder"
EMERGENT_LLM_KEY=your_emergent_key_here
```

**frontend/.env**
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/session` | Exchange OAuth session_id for token |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/logout` | Logout user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/profile` | Get current user profile |
| PUT | `/api/users/profile` | Update user profile |
| GET | `/api/users/search` | Search users by skills |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects with filters |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Matching & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/match/{project_id}` | Get skill matches for project |
| POST | `/api/ai/team-builder` | AI team building assistant |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seed` | Seed database with sample data |

## 🖼️ Screenshots

### Login Screen
- Clean login UI with Google OAuth
- Feature highlights: Find Teammates, AI Matching, Launch Projects

### Home Dashboard
- Stats grid (Active Users, Projects, Open Positions)
- Quick Actions (Edit Profile, Browse Projects, AI Team Builder)
- How It Works guide
- Recent Projects

### AI Team Builder
- Natural language input for team requirements
- Project selection (optional)
- AI-generated recommendations with:
  - Analysis of requirements
  - Recommended team members with roles
  - Introduction message
- Approve & Send Invitations

### Profile
- User info with avatar
- Skills management (add/remove)
- Experience level selection
- Availability status
- Theme settings (Light/Dark/System)
- Biometric login toggle

## 🔧 Configuration

### Expo (app.json)
The app is configured for cross-platform deployment:
- Web, iOS, and Android support
- Expo Router for file-based navigation
- Icon and splash screen assets

### TypeScript
Full TypeScript support with:
- Strict type checking
- Path aliases configured
- Type definitions for all models

## 📱 Supported Platforms

- ✅ **Web** - Full browser support
- ✅ **iOS** - Via Expo Go or native build
- ✅ **Android** - Via Expo Go or native build

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Original [MICROLAND](https://github.com/Pratiklakkundi/MICROLAND) repository
- Expo team for the amazing framework
- Claude AI for team building assistance
