const { getDb } = require("../infrastructure/db");
const { getStoragePathForInternalAsset, videoProcessingBasePath } = require("../../common/assetUtils");
const { escapeForShell } = require("../../common/fileUtils");
const { spawnSync } = require("child_process");

/**
 * Processor for video processing tasks.
 * This processor is used by the queue to handle all the task.processVideo jobs.
 * It calls the video processing pipeline and updates the database with
 * the corresponding results once things are complete.
 */

// Status code for the client side to understand status.
const PROCESSING_STATE = {
  PROCESSING: 0,
  ERRORED: 1,
  SUCCESSFUL: 2,
};

// Errors code communicated by the pipeline.
const PROCESSING_ERRORS = {
  0: "SUCCESS",
  1: "SOURCE_FILE_NOT_FOUND",
  2: "OUTPUT_FILE_NOT_CREATED",
  3: "INVALID_PARAMETERS_PROVIDED",
  4: "INVALID_PROCESSING_METHOD",
  5: "MISSING_OPERATION_SETTINGS",
};

const setProcessingStatus = async (newStatus, taskId, details = null, location = null, update_time = null) => {
  await getDb().run(
    `
        UPDATE video_processing_task
        SET processing_status = :processing_status,
        details = :details,
        transform_video_file_source = :location,
        job_completion_time = :job_completion_time
        WHERE id = :id
        `,
    {
      ":id": taskId,
      ":processing_status": newStatus,
      ":location": location,
      ":details": details,
      ":job_completion_time": update_time,
    }
  );
};

const getLatestTaskStatus = async (videoTaskId) => {
  return await getDb().get("SELECT * FROM video_processing_task where id = :id", { ":id": videoTaskId });
};

module.exports = async (videoTaskId, method, configuration) => {
  const currentStatus = await getLatestTaskStatus(videoTaskId);
  if (!currentStatus) {
    return null;
  }
  const { video_file_source } = currentStatus;
  //Update status to success on process return succesful.
  try {
    const storageRelativeOutPath = `transformed/${videoTaskId}`;
    const storageOutPath = getStoragePathForInternalAsset(storageRelativeOutPath);

    if (!configuration) {
      configuration = {};
    }

    // Spawn a process to request the processing of the video.
    const childProcess = spawnSync(
      `cd ${videoProcessingBasePath} && pipenv run processing-pipeline`,
      [video_file_source, storageOutPath, method, configuration ? escapeForShell(JSON.stringify(configuration)) : null],
      {
        shell: true,
        encoding: "utf8",
        stdio: "inherit",
      }
    );

    //Once finished set the result in the DB so it can be accessed by the frontend or any other consumers.
    if (childProcess.status === 0) {
      setProcessingStatus(PROCESSING_STATE.SUCCESSFUL, videoTaskId, null, storageRelativeOutPath, Date.now());
    } else {
      setProcessingStatus(
        PROCESSING_STATE.ERRORED,
        videoTaskId,
        PROCESSING_ERRORS[childProcess.status] ?? "PROCESSING_PIPELINE_ERROR"
      );
    }
  } catch (e) {
    console.error("Error Processing Video: ", e);
    setProcessingStatus(PROCESSING_STATE.ERRORED, videoTaskId, e.toString() ?? "PROCESSING_PROCESS_ERROR");
    throw e;
  }
  return PROCESSING_STATE.SUCCESSFUL;
};
