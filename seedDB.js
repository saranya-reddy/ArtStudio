import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";

import { userModel } from "./models/userModel.js";
import { paintingModel } from "./models/paintingModel.js";

dotenv.config();

const rawData = fs.readFileSync("./seed.json", "utf-8");
const seedData = JSON.parse(rawData);

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("📦 Connected to MongoDB Atlas...");

        // 1. Seed Studio Admin Account
        const existingAdmin = await userModel.findOne({ username: seedData.studioAccount.email });
        let adminUser;
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(seedData.studioAccount.password, 10);
            adminUser = await userModel.create({
                username: seedData.studioAccount.email,
                fullName: "Art Studio Admin",
                password: hashedPassword,
                role: "admin"
            });
            console.log("👤 Studio Admin account created.");
        } else {
            adminUser = existingAdmin;
            console.log("👤 Studio Admin already exists.");
        }

        // 2. Seed Paintings
        await paintingModel.deleteMany({});
        const paintingsToInsert = seedData.paintings.map((p) => ({
            uploadedBy: adminUser._id,
            title: p.title,
            artist: p.artist,
            paintingImage: p.imageUrl,
            price: p.price,
            descriptions: p.description,
            status: p.status,
            isAvailable: p.status === "available"
        }));

        await paintingModel.insertMany(paintingsToInsert);
        console.log(`🎨 Successfully seeded ${paintingsToInsert.length} paintings into MongoDB!`);

        console.log("✨ Seeding process completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();