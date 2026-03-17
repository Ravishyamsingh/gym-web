require("../config/loadEnv");

const mongoose = require("mongoose");
const User = require("../models/User");

const BASE_URL = process.env.TEST_BASE_URL;
const PASSWORD = "QaCheck123!";

if (!BASE_URL) {
  throw new Error("TEST_BASE_URL is required in environment configuration.");
}

function uniqueTag() {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, "0");
  return `${t}${r}`;
}

async function callApi(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: response.ok, status: response.status, data };
}

async function registerUser({ name, email, userId }) {
  const created = await User.create({
    name,
    email,
    userId,
    password: PASSWORD,
    authProvider: "password",
    firebaseId: `qa_fb_${userId}`,
  });

  return {
    id: created._id.toString(),
    email,
    userId,
    name,
  };
}

async function loginByUserId(userId) {
  const result = await callApi(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password: PASSWORD }),
  });

  if (!result.ok || !result.data?.jwtToken) {
    throw new Error(`Login failed for ${userId}: ${result.status} ${JSON.stringify(result.data)}`);
  }

  return result.data.jwtToken;
}

function pass(label, extra = "") {
  console.log(`PASS: ${label}${extra ? ` -> ${extra}` : ""}`);
}

function fail(label, extra = "") {
  console.log(`FAIL: ${label}${extra ? ` -> ${extra}` : ""}`);
}

async function run() {
  const tag = uniqueTag();

  await mongoose.connect(process.env.MONGO_URI);

  const userA = await registerUser({
    name: `QA User A ${tag}`,
    email: `qa.usera.${tag}@example.com`,
    userId: `qaa${tag}`,
  });

  const userB = await registerUser({
    name: `QA User B ${tag}`,
    email: `qa.userb.${tag}@example.com`,
    userId: `qab${tag}`,
  });

  const userC = await registerUser({
    name: `QA User C ${tag}`,
    email: `qa.userc.${tag}@example.com`,
    userId: `qac${tag}`,
  });

  // Promote user B to admin directly in DB for role-based route checks.
  await User.updateOne({ _id: userB.id }, { $set: { role: "admin" } });
  await mongoose.disconnect();

  userA.token = await loginByUserId(userA.userId);
  const adminToken = await loginByUserId(userB.userId);
  userC.token = await loginByUserId(userC.userId);

  const createOrderRes = await callApi(`${BASE_URL}/payments/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({ planId: "1month" }),
  });

  if (!createOrderRes.ok || !createOrderRes.data?.orderId) {
    throw new Error(`Create order failed: ${createOrderRes.status} ${JSON.stringify(createOrderRes.data)}`);
  }

  const orderId = createOrderRes.data.orderId;

  const ownerStatus = await callApi(`${BASE_URL}/payments/${orderId}/status`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });

  if (ownerStatus.status === 200) {
    pass("Owner can fetch own order status", `status=${ownerStatus.status}`);
  } else {
    fail("Owner can fetch own order status", `status=${ownerStatus.status}`);
  }

  const otherUserStatus = await callApi(`${BASE_URL}/payments/${orderId}/status`, {
    headers: { Authorization: `Bearer ${userC.token}` },
  });

  if (otherUserStatus.status === 403) {
    pass("Other user blocked from foreign order status", `status=${otherUserStatus.status}`);
  } else {
    fail("Other user blocked from foreign order status", `status=${otherUserStatus.status}`);
  }

  const adminStatus = await callApi(`${BASE_URL}/payments/${orderId}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (adminStatus.status === 200) {
    pass("Admin can fetch any order status", `status=${adminStatus.status}`);
  } else {
    fail("Admin can fetch any order status", `status=${adminStatus.status}`);
  }

  const adminPayments = await callApi(`${BASE_URL}/payments?page=1&limit=5&q=${encodeURIComponent("qa user a")}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (adminPayments.status === 200 && Array.isArray(adminPayments.data?.payments)) {
    pass(
      "Admin payments pagination/search endpoint works",
      `status=${adminPayments.status}, returned=${adminPayments.data.payments.length}, total=${adminPayments.data.total}`
    );
  } else {
    fail("Admin payments pagination/search endpoint works", `status=${adminPayments.status}`);
  }

  const adminStats = await callApi(`${BASE_URL}/payments/stats/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (adminStats.status === 200 && adminStats.data?.stats) {
    pass("Admin payment stats endpoint works", `status=${adminStats.status}`);
  } else {
    fail("Admin payment stats endpoint works", `status=${adminStats.status}`);
  }

  console.log("\nRESULT: Security and admin payment endpoint checks completed.");
}

run().catch((err) => {
  console.error("CHECK_FAILED:", err.message);
  process.exitCode = 1;
});
