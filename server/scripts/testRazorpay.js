#!/usr/bin/env node

require("../config/loadEnv");
const { createRazorpayOrder, getRazorpayInstance } = require("../utils/razorpayService");
const mongoose = require("mongoose");

(async () => {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🧪 RAZORPAY ORDER CREATION TEST");
    console.log("=".repeat(70));

    console.log("\n1️⃣ Checking Razorpay Credentials:");
    console.log(`   RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? "✅ SET" : "❌ MISSING"}`);
    console.log(`   RAZORPAY_KEY_SECRET: ${process.env.RAZORPAY_KEY_SECRET ? "✅ SET" : "❌ MISSING"}`);
    console.log(`   RAZORPAY_WEBHOOK_SECRET: ${process.env.RAZORPAY_WEBHOOK_SECRET ? "✅ SET" : "❌ MISSING"}`);

    console.log("\n2️⃣ Initializing Razorpay Instance:");
    const instance = getRazorpayInstance();
    console.log("   ✅ Razorpay instance initialized");

    console.log("\n3️⃣ Testing Razorpay API Connection:");
    // Try to create a test order
    const testOrder = await instance.orders.create({
      amount: 100, // ₹1
      currency: "INR",
      receipt: `test_${Date.now()}`,
      payment_capture: 1,
      notes: {
        test: "test_order",
      },
    });
    console.log(`   ✅ Test order created successfully`);
    console.log(`   Order ID: ${testOrder.id}`);
    console.log(`   Amount: ₹${testOrder.amount / 100}`);
    console.log(`   Status: ${testOrder.status}`);

    console.log("\n4️⃣ Testing createRazorpayOrder Function:");
    const order = await createRazorpayOrder({
      userId: "507f1f77bcf86cd799439011",
      planId: "1month",
      amount: 100,
    });
    console.log(`   ✅ Order created via createRazorpayOrder`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Amount: ₹${order.amount / 100}`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL TESTS PASSED - RAZORPAY IS WORKING CORRECTLY");
    console.log("=".repeat(70) + "\n");

    process.exit(0);
  } catch (err) {
    console.error(`\n❌ ERROR:`, err.message);
    console.error("\nFull Error Details:");
    console.error(err);
    process.exit(1);
  }
})();
