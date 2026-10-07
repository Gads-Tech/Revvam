#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function loadEnv() {
  const path = ".env";
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const username = process.argv[2] || "revvam_ops";
const email = process.argv[3] || "admin@revvam.com";
const name = "Revvam Operations";
const password = process.env.REVVAM_ADMIN_PASSWORD;

if (!password || password.length < 20) {
  console.error("Set REVVAM_ADMIN_PASSWORD to a strong password of at least 20 characters.");
  process.exit(1);
}

if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
  console.error("Username must contain 3–20 letters, numbers, or underscores.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { username },
    update: { name, email, passwordHash, role: "ADMIN" },
    create: { name, username, email, passwordHash, role: "ADMIN" },
    select: { id: true, username: true, email: true, role: true },
  });

  console.log("Admin account ready:");
  console.log(JSON.stringify(user, null, 2));
} finally {
  await prisma.$disconnect();
}
