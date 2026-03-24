# Municipal Complaint Management System

This application is built using a modern full-stack TypeScript environment (Node.js + React). While XAMPP is traditionally used for PHP, you can easily run this application on your local machine using Node.js.

## Prerequisites
- **Node.js** (v18 or higher) installed on your system.
- **npm** (comes with Node.js).

## How to Run Locally

1. **Download the Source Code**:
   Extract the project files into a folder on your computer.

2. **Install Dependencies**:
   Open your terminal/command prompt in the project folder and run:
   ```bash
   npm install
   ```

3. **Run the Application**:
   Start the development server:
   ```bash
   npm run dev
   ```

4. **Access the App**:
   Open your browser and go to:
   `http://localhost:3000`

## Database Information
- This application uses **SQLite**, which is a file-based database (`municipal.db`).
- You **do not need to set up a separate MySQL server** or use phpMyAdmin. The database is automatically created and managed by the application.
- If you still wish to use MySQL, I have provided a `database.sql` file in the root directory with the schema.

## Default Admin Credentials
- **Email**: `admin@municipal.gov`
- **Password**: `admin123`

## Why Node.js instead of PHP?
This application uses a modern **Single Page Application (SPA)** architecture with React. This allows for:
- Smoother transitions and a better user experience.
- Real-time updates and interactive charts (Chart.js).
- Better performance and modern security practices (like hashed passwords and prepared statements).
