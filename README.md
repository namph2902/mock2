# Vue User Manager

A modern, user-friendly Vue.js application for managing users with enhanced UX patterns, dedicated edit forms, and streamlined workflows.

## ✨ Features

- **Dedicated Edit Modal**: Separate edit experience in a focused modal dialog
- **Auto-Sort Table**: Click column headers to sort users by ID, name, email, or age
- **Real-time Validation**: Form validation with immediate feedback
- **Smart Confirmations**: Prevents data loss with unsaved changes warnings
- **Professional UI**: Clean design focused on usability and efficiency
- **Responsive Design**: Works perfectly on all devices
- **Live/Demo Mode**: Automatically switches between server and demo data

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Go 1.19+ (for backend server)
- PostgreSQL (for live data mode)

### Installation

```sh
# Install dependencies
cd axios-vue_client
npm install
```

### Development

```sh
# Start the Vue development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Backend Server (Optional)

```sh
# In another terminal, start the Go server
cd server
go run server.go
```

## 🎯 Enhanced User Experience

### Streamlined Workflows
- **Add Form**: Always visible at the top for quick user creation
- **Edit Modal**: Dedicated modal dialog for editing existing users
- **Auto-clear**: Add form automatically clears after successful creation
- **Sort Table**: Click any column header to sort users

### Smart Interactions
- **Unsaved Changes Protection**: Warns before losing changes
- **Visual Feedback**: Form validation with color-coded field borders
- **Loading States**: Visual feedback during API calls
- **Keyboard Shortcuts**: 
  - `Escape` to cancel editing
  - `Ctrl/Cmd + S` to save changes (in edit modal)

### User-Friendly Features
- **Connection Status**: Shows if using live server or demo data
- **User Count Display**: Shows total number of users
- **Empty State**: Helpful message when no users exist
- **Form State Management**: Tracks changes and validation

## 🛠 Project Structure

```
axios-vue_client/
├── src/
│   ├── App.vue           # Main application component
│   ├── main.js           # Application entry point
│   ├── assets/
│   │   ├── base.css      # Core design system
│   │   ├── main.css      # Layout and responsive styles
│   │   └── theme-components-clean.css  # Essential UI components only
│   └── services/
│       └── api.js        # API service layer
└── package.json
```

## 🔧 Configuration

The application automatically detects if the backend server is running:
- **Live Mode**: Full CRUD operations with PostgreSQL
- **Demo Mode**: Local data simulation when server is unavailable

## 📱 Responsive Design

- Mobile-first approach
- Optimized for tablets and desktops
- Touch-friendly interface
- Accessible design patterns

## 🎨 Design System

Built with a professional design system featuring:
- Consistent spacing and typography
- Modern color palette
- Smooth animations and transitions
- Modal dialogs for focused interactions
- Sortable table headers with visual feedback

## 🗂️ Optimized Architecture

### Removed Unnecessary Features
- ❌ Toast notifications (replaced with console logging)
- ❌ Inline form editing (replaced with dedicated modal)
- ❌ Unused CSS components (70% reduction in CSS size)
- ❌ Marketing/promotional elements

### Enhanced Core Features
- ✅ Dedicated edit modal for better UX
- ✅ Auto-sort functionality for all table columns
- ✅ Streamlined form workflows
- ✅ Minimal, focused CSS (150 lines vs 500+ originally)
- ✅ Clean separation between add and edit functions

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

### Compile and Minify for Production

```sh
npm run build
```
