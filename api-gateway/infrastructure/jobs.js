const celery = require("celery-node");

/**
 * Jobs Enqueuing Client
 * This creates a client for the RabbitMQ Celery integration, it enables the API gateway to enqueue jobs.
 * These jobs are then processed asynchronously by whatever worker is able to understand them.
 */

console.info("Initializing Celery Client for Job Enqueing...");

// We use Celery and a RabbitMQ backend for message passing.
const client = celery.createClient("amqp://localhost:5672?heartbeat=5", "amqp://localhost:5672?heartbeat=5");

const enqueueTask = (name, args) => {
  if (!client) {
    console.error("Job client has not been initialized");
    return;
  }
  console.info("Sending task", name, args);
  return client.sendTask(name, args, {});
};

const enqueueTestTask = async (a, b) => {
  const taskName = "tasks.add";
  const args = [a, b];
  return await enqueueTask(taskName, args).get(5000);
};

const enqueueProcessingTask = async (processingTaskId, method, configuration) => {
  const taskName = "tasks.processVideo";
  const args = [processingTaskId, method, configuration];
  await enqueueTask(taskName, args);
  return 0;
};

module.exports = {
  enqueueTestTask,
  enqueueProcessingTask,
};
