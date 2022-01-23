const celery = require("celery-node");

/**
 * Job Orchestrator
 * This service listens to the job queue requests pushed by the API gateway or any other service.
 * It then executes actions according to the job requested.
 */

const { checkAndTransformedDataDirectory } = require("../common/assetUtils");
checkAndTransformedDataDirectory();

// Register the same RabbitMq settings we use on the producer side.
const worker = celery.createWorker("amqp://localhost:5672?heartbeat=10000", "amqp://localhost:5672?heartbeat=10000");

console.info("Registering test task tasks.add");
worker.register("tasks.add", require("./tasks/add"));
worker.register("tasks.processVideo", require("./tasks/processVideo"));
worker.register("error", require("./tasks/error"));

// Start the jobs, as they get sent they should be processed.
console.info("Starting Job Orchestrator");
worker.start().catch((e) => console.error(e));
