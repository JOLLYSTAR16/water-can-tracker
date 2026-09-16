# 💧 Water Can Tracker

A simple web application for managing the shared water-can rotation among house members.

The system keeps track of whose turn it is, records when a member fills the water can or is absent, and automatically moves the turn to the next active member.

## Features

- 🔐 Secure login
- 🔑 Password change on first login
- 💧 Automatic water-can rotation
- ✓ Mark water can as filled
- ✕ Mark a turn as absent
- 👥 Member management
- 🔄 Automatic turn advancement
- 📊 Member statistics
- 📜 Water-can history
- 🛠️ Admin dashboard
- 🔑 Admin password reset
- 🔀 Admin current-turn override
- ✏️ History correction
- 🗑️ History deletion
- 🟢 Member activation/deactivation
- 📱 Mobile-friendly interface

## User Roles

### House Member

Members can:

- Log in
- Change their password
- View the current water-can turn
- Mark their own turn as filled
- Mark themselves as absent
- View statistics
- View recent history

Only the member whose turn is currently active can mark the water can as filled or absent.

### Administrator

The administrator can:

- View all house members
- Add members
- Activate/deactivate members
- Reset member passwords
- Change the current water-can turn
- View complete history
- Correct history records
- Delete incorrect history records
- View overall statistics

The administrator is not included in the normal water-can rotation.

## Rotation

The default rotation is:

1. Akshai
2. Muruganand
3. Pranav
4. Rishab

After Rishab, the rotation returns to Akshai.

The rotation advances only when the current member marks the water can as:

- `FILLED`
- `ABSENT`

If a member is absent, their turn is skipped but they remain part of future rotations.

## Technology Stack

### Frontend

- React
- Vite
- React Router
- CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- JWT Authentication
- Argon2 Password Hashing

### Database

- SQLite for local development
- PostgreSQL planned for production

## Project Structure

```text
water-can-tracker/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── utils/
│   │   ├── database.py
│   │   └── main.py
│   │
│   ├── create_admin.py
│   ├── create_users.py
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── .gitignore
│
└── README.md
