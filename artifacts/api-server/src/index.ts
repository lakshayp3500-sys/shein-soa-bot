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
      }
    });
  }
}

launchBot().catch((err) => {
  logger.error({ err }, "Failed to launch bot");
  process.exit(1);
});
