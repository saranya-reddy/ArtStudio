System Design & Architecture Document
1. System Overview
The application manages end-to-end workflows: discovery, customized booking/request forms, artist task management, pricing calculation, date validation, and status tracking.

2. Tech Stack & Architecture
Backend (Node.js & Express)Runtime: Node.js
Framework: Express.js
Database: MongoDB (via Mongoose ODM)
Authentication: JWT (JSON Web Tokens) with custom verification middleware
Authorization: Role-Based Access Control (RBAC) via allowedRolesMiddleware (customer, admin/artist)
Frontend (React)UI Framework: React (Single Page Application architecture)
State Management: React State (useState, useContext or global store)
API Client: Axios or Fetch API with Authorization header interceptors

3. Data Models & Schemas

3.1 User Model (userModel.js)interface IUser {
  _id: ObjectId;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin' | 'artist';
  createdAt: Date;
}

3.2 Wall Booking Model (wallBookingModel.js)interface IWallBooking {
  _id: ObjectId;
  customer: ObjectId; // Ref to User
  artist: ObjectId;   // Ref to User
  date: Date;         // Booking date (7–90 days in advance)
  size: number;       // In sq ft (10–500 sq ft)
  address: string;    // Location for mural painting
  price: number;      // Derived: size * 150
  designImage?: string; // Image URL/Path
  status: 'requested' | 'confirmed' | 'declined' | 'cancelled';
  createdAt: Date;
}

3.3 Pottery Request Model (potteryRequestModel.js)interface IPotteryRequest {
  _id: ObjectId;
  customer: ObjectId;     // Ref to User
  artist: ObjectId;       // Ref to User
  item: string;           // E.g., 'Vase', 'Mug', 'Bowl'
  glaze: string;          // E.g., 'Matte', 'Glossy', 'Speckled'
  quantity: number;       // 1–12 units
  neededByDate: Date;     // Minimum 14 days in advance
  designImage?: string;   // Image URL/Path
  status: 'requested' | 'confirmed' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Date;
}

# TO START THE SERVER 
node server.js or nodemon server.js

# TO OPEN THE WEB PAGE
http://localhost:2500/

# .env file should contain following
PORT = 2500
DB_URL= mongodb://saranyagurrampati_db_user:m22mYdPe5555BL7S@ac-kjjlwr0-shard-00-00.gd9z2kh.mongodb.net:27017,ac-kjjlwr0-shard-00-01.gd9z2kh.mongodb.net:27017,ac-kjjlwr0-shard-00-02.gd9z2kh.mongodb.net:27017/?ssl=true&replicaSet=atlas-i7soip-shard-0&authSource=admin

JWT_SECRET = "abcdefghijklmnopqrstuvwxyzZZZZZZ"

# Artist And Admin Logins
Artist : 
username : firstname@artstudio.in 
   (like : revathi@artstudio.in for Revathi Iyer)
password : artist123

Admin :
username : ADMIN@artstudio.in
password : ADMIN

