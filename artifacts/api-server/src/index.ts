import app from "./app.js";
import { logger } from "./lib/logger.js";
import { launchBot } from "./bot/index.js";

const rawPort = process.env["PORT"];

if (rawPort) {
  const port = Number(rawPort);
  if (!Number.isNaN(port) && port > 0) {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
      } else {
        logger.info({ port }, "Server listening");

        const externalUrl = process.env["RENDER_EXTERNAL_URL"];
        if (externalUrl) {
          const pingUrl = `${externalUrl}/api/healthz`;
          setInterval(async () => {
            try {
              await fetch(pingUrl);
              logger.info("Keep-alive ping sent");
            } catch (err) {
              logger.warn({ err }, "Keep-alive ping failed");
            }
          }, 5 * 60 * 1000);
          logger.info({ pingUrl }, "Keep-alive started (every 5 min)");
        }
      }
    });
  }
}

launchBot().catch((err) => {
  logger.error({ err }, "Failed to launch bot");
  process.exit(1);
});
