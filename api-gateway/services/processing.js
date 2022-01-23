const { getDb } = require("../infrastructure/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Processing Service
 * Operations to manage tasks and processing jobs in the database.
 */

const PROCESSING_STATE = {
  PROCESSING: 0,
  ERRORED: 1,
  SUCCESSFUL: 2,
};

const getLatestStateForProcessingJob = async (jobId) => {
  return await getDb().get("SELECT * FROM video_processing_task where id = :id", { ":id": jobId });
};

const createProcessingTask = async (videoSourceFileName, processingMethod, additionalConfig) => {
  const taskId = uuidv4();
  await getDb().run(
    `
    INSERT INTO video_processing_task
    (id, video_file_source, processing_status, job_enqueue_time, job_configuration, method)
    VALUES
    (:id, :video_file_source, :processing_status, :job_enqueue_time, :job_configuration, :method)
    `,
    {
      ":id": taskId,
      ":video_file_source": videoSourceFileName,
      ":processing_status": PROCESSING_STATE.PROCESSING,
      ":job_enqueue_time": Date.now(),
      ":job_configuration": additionalConfig ? JSON.stringify(additionalConfig) : null,
      ":method": processingMethod,
    }
  );
  return taskId;
};

module.exports = {
  getLatestStateForProcessingJob,
  createProcessingTask,
};
