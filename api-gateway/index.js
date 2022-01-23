const express = require("express");
const multer = require("multer");
const fs = require("fs").promises;
const app = express();
const styleService = require("./services/styles");
const processingService = require("./services/processing");
const jobManager = require("./infrastructure/jobs");

/**
 * API Gateway
 */

const {
  uploadDataDirectory,
  getStoragePathForInternalAsset,
  getStorgePathForUploadedAsset,
  checkAndCreateUploadDataDirectory,
} = require("../common/assetUtils");

checkAndCreateUploadDataDirectory();

// Define the base for multer to manage uploads.
const upload = multer({ dest: uploadDataDirectory });

// Allow frontend to talk to this API by explicitly defining CORS rules.
// In Production this would be more restrictive as it should only allow acceptable hosts!
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  next();
});

/*****************************************
 * API ROUTES
 ******************************************/

/**
 * Health Check
 * Simple connectivity test for the API.
 */
app.get("/", (req, res) => {
  res.send("Welcome to the Styler API");
});

/**
 * Test Check
 * Simple connectivity test for the job enqueuer.
 */
app.get("/test-job", async (req, res) => {
  try {
    const sum = await jobManager.enqueueTestTask(1, 2);
    res.send("Enqueued test job and result was " + sum);
  } catch (e) {
    console.error("Error enqueing test job", e);
    return res.sendStatus(500);
  }
});

/**
 * Trigger Processing Job
 * Simple trigger test for the job enqueuer. Useful for testing actions.
 */
app.get("/test-processing-job/:task_id", async (req, res) => {
  try {
    const sum = await jobManager.enqueueProcessingTask(req.params.task_id, "style-transfer", {
      frame_drop_rate: 0.9,
      scaling_max_dimension: 250,
      use_gray_scale: false,
    });
    res.send("Enqueued processing job " + req.params.task_id);
  } catch (e) {
    console.error("Error enqueing video processing job", e);
    return res.sendStatus(500);
  }
});

/**
 * Get Available Styles
 * Enables the client to fetch all the available pre-defined styles.
 */
app.get("/get_available_styles", async (req, res) => {
  // Query db for styles instead.
  let styles = null;
  try {
    styles = await styleService.getAllAvailableStyles();
  } catch (e) {
    console.error(e);
    styles = [];
  }
  styles = styles.map(({ id, description, style_file_source }) => ({
    id,
    description,
    imageUrl: `assets/${style_file_source}`,
  }));
  res.json(styles);
});

/**
 * Get Processing Status
 * For a task being processed, return the current processing status.
 * If the status is sucessful, look at the processed video output for the transformed video asset.
 * If the status is an error, look at the detail for more context.
 */
app.get("/get_latest_video_state/:task_id", async (req, res) => {
  const latestStatus = await processingService.getLatestStateForProcessingJob(req.params.task_id);
  if (!latestStatus) {
    return res.sendStatus(404);
  }
  const transformedVideoPath = latestStatus.transform_video_file_source ?? null;
  const configuration = JSON.parse(latestStatus.job_configuration ?? {});
  const additionalData = {};

  if (latestStatus.method === "style-transfer" && transformedVideoPath) {
    //There has to be a better way to serve this asset.
    additionalData.styleAsset = await fs.readFile(configuration.operation_configuration.style_file_source, {
      encoding: "base64",
    });
  }

  res.json({
    status: latestStatus.processing_status,
    videoSourceUrl: transformedVideoPath ? `assets/${transformedVideoPath}` : null,
    details: latestStatus.details ?? null,
    additionalData,
  });
});

/**
 * Upload Video For Processing
 * Enables the client to push a video, and optionally a custom style image.
 * If the custom style image is not provided, the pre-defined style id is used.
 * This will enqueue the job for processing and return a task id for the client to probe and listen for changes.
 */
app.post(
  "/upload_video_for_processing",
  upload.fields([
    { name: "customImageStyle", maxCount: 1 },
    { name: "videoSource", maxCount: 1 },
  ]),
  async (req, res) => {
    const { videoSource, customImageStyle } = req.files;
    const { selectedImageStyle, processingMethod, frameDropRate, scalingMaxDimension, scalingMaxStyle } = req.body;
    const videoSourceFileName = videoSource ? videoSource[0].filename : null;
    const customStyleFileName = customImageStyle ? customImageStyle[0].filename : null;

    if (!processingMethod) {
      return res.sendStatus(400);
    }
    if (!videoSourceFileName) {
      return res.sendStatus(400);
    }

    const configuration = {};
    let styleFilePath = null;

    if (processingMethod === "style-transfer") {
      const existingStyle = await styleService.getStyleById(selectedImageStyle);
      if (!existingStyle && !customImageStyle) {
        return res.sendStatus(400);
      }
      // Use style if provided as an attachment, otherwise fetch the asset path for the pre-defined style.
      styleFilePath = customStyleFileName
        ? getStorgePathForUploadedAsset(customStyleFileName)
        : getStoragePathForInternalAsset(existingStyle.style_file_source);
      if (scalingMaxStyle) {
        configuration.scaling_max_style = Number(scalingMaxStyle);
      }
      configuration.operation_configuration = { style_file_source: styleFilePath };
    }
    if (frameDropRate) {
      configuration.frame_drop_rate = Number(frameDropRate);
    }
    if (scalingMaxDimension) {
      configuration.scaling_max_dimension = Number(scalingMaxDimension);
    }

    const processingTaskId = await processingService.createProcessingTask(
      getStorgePathForUploadedAsset(videoSourceFileName),
      processingMethod,
      configuration
    );

    //Enqueue a task for the other system to process it.
    jobManager.enqueueProcessingTask(processingTaskId, processingMethod, configuration);
    res.json({ queueTaskId: processingTaskId });
  }
);

/**
 * Static Data
 * Endpoints that act as a bridge between the API and the static storage.
 * This is useful for exposing assets to the client without exposing implementation or storage details.
 */
app.use("/assets/styles", express.static(getStoragePathForInternalAsset("/styles")));
app.use("/assets/transformed/:task_id", (req, res) => {
  res.download(`${getStoragePathForInternalAsset("/transformed")}/${req.params.task_id}.mp4`);
});

// Use PORT 3000 as a default.
const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Styler API listening on http://localhost:${port}`);
});
