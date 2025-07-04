# WhatsMe<span style="color:#0ea5e9">Up</span> - Modern Chat Application

WhatsMe**Up** is a modern, open-source, self-hosted chat application with a sleek UI powered by TanStack, Framer Motion, React Icons, and Django.

## Features

- **Beautiful UI/UX**: Modern interface with smooth animations and transitions
- **Real-time Messaging**: Send and receive messages in real-time
- **Dark/Light Mode**: Toggle between dark and light themes
- **Authentication**: Sign up and login with username, email, or phone number
- **User Profiles**: Customize your profile with pictures and personal information
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **File Sharing**: Share images and files in conversations
- **Group Chats**: Create and manage group conversations
- **Message Status**: See when messages are delivered and read

## Tech Stack

### Frontend
- **React**: UI library for building the user interface
- **TanStack Query**: Data fetching, caching, and state management
- **Framer Motion**: Animations and transitions
- **React Router**: Navigation and routing
- **Tailwind CSS**: Utility-first CSS framework
- **React Icons**: Icon library

### Backend
- **Django**: Python web framework
- **Django REST Framework**: RESTful API framework
- **Simple JWT**: JWT authentication
- **SQLite**: Database (can be replaced with PostgreSQL, MySQL, etc.)

## Getting Started

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whatsmeup.git
   cd whatsmeup
   ```

2. **Set up the backend**
   ```bash
   # Create a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   cd backend
   pip install -r requirements.txt
   
   # Run migrations
   python manage.py migrate
   
   # Create a superuser
   python manage.py createsuperuser
   
   # Start the development server
   python manage.py runserver
   ```

3. **Set up the frontend**
   ```bash
   # Install dependencies
   npm install
   
   # Start the development server
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - Admin panel: http://localhost:8000/admin

## Project Structure

```
whatsmeup/
├── backend/               # Django backend
│   ├── accounts/          # User authentication and profiles
│   ├── chat/              # Chat functionality
│   └── backend/           # Project settings
├── src/                   # React frontend
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── App.js             # Main application component
└── public/                # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Django](https://www.djangoproject.com/)
- [TanStack Query](https://tanstack.com/query)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
