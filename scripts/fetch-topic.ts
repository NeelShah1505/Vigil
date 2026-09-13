import { loadConfig } from "@vigil/config";
import { MirrorClient } from "@vigil/mirror";

async function main() {
  const config = loadConfig();
  const topicId = process.argv[2] || config.topicId;

  if (!topicId) {
    console.error("❌ No topic ID provided and HCS_TOPIC_ID is not set in .env");
    process.exit(1);
  }

  console.log(`=== FETCHING HCS EVENTS (Topic: ${topicId}) ===\n`);
  const mirror = new MirrorClient(config.mirrorNodeUrl);

  try {
    const messages = await mirror.getTopicMessages(topicId, 25);
    if (messages.length === 0) {
      console.log("No messages found on this topic yet.");
      return;
    }

    console.log(`Found ${messages.length} messages (latest first):\n`);
    for (const msg of messages) {
      console.log(`[Seq #${msg.seq}] Timestamp: ${msg.ts}`);
      try {
        const parsed = JSON.parse(msg.message);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(`Raw: ${msg.message}`);
      }
      console.log("--------------------------------------------------");
    }
  } catch (err: any) {
    console.error(`Error fetching topic messages: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
