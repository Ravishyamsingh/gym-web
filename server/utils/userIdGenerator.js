const Counter = require("../models/Counter");

/**
 * Generates the next sequential numeric user ID (always 4 digits)
 * Starting from 2000 and incrementing by 1 for each new user
 * IDs range from 2000 to 9999 (10,000 maximum users)
 *
 * @returns {Promise<string>} The next user ID as a 4-digit string (e.g., "2000", "2001")
 */
async function generateNextUserId() {
  try {
    const counter = await Counter.findByIdAndUpdate(
      "userId", // identifier for user ID counter
      { $inc: { seq: 1 } }, // increment by 1
      { new: true, upsert: true } // return updated doc, create if doesn't exist
    );

    // Ensure the sequence number is at least 2000
    if (counter.seq < 2000) {
      counter.seq = 2000;
      await counter.save();
    }

    // Format as 4-digit string, e.g., "2000", "2001", etc.
    return String(counter.seq).padStart(4, "0");
  } catch (error) {
    console.error("[generateNextUserId] Error:", error);
    throw new Error("Failed to generate user ID");
  }
}

module.exports = { generateNextUserId };
