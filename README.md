## Technologies Used

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT for authentication
- Multer for file uploads
- Sharp for image compression

## Installation

### Prerequisites

- Node.js (v14 or newer)
- PostgreSQL database
- npm or yarn

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tcg-pos-backend.git
   cd tcg-pos-backend
2. Install dependencies:
   ```bash
   npm install
4. Create a .env file in the root directory with the following variables:
   ```
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/tcg_pos_db?schema=public"
    
   # Server
   PORT=3000
   NODE_ENV=development
    
   # Authentication
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
    
   # File uploads
   UPLOAD_DIR=uploads
6. Set up the database and run migrations:
   ```bash
   npx prisma migrate dev
7. Seed the database with initial data:
   ```bash
   npm run seed
9. Start the development server:
   ```bash
   npm run dev
