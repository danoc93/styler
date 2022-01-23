const fs = require("fs");

/**
 * Asset Utils
 * Utility functions to handle paths and access for the storage systems.
 */

const uploadDataDirectory = `${__dirname}/../upload-data`;
const internalStorageDirectory = `${__dirname}/../storage`;
const videoProcessingBasePath = `${__dirname}/../video-processing`;

// Get the full path for static internal assets.
const getStoragePathForInternalAsset = (path) => {
  return `${internalStorageDirectory}/${path}`;
};
// Get the full path for client uploaded assets.
const getStorgePathForUploadedAsset = (path) => {
  return `${uploadDataDirectory}/${path}`;
};

const checkAndCreateUploadDataDirectory = () => {
  if (!fs.existsSync(uploadDataDirectory)) {
    console.info("Creating uploads directory", uploadDataDirectory);
    fs.mkdirSync(uploadDataDirectory, {
      recursive: true,
    });
  }
};

const checkAndTransformedDataDirectory = () => {
  const transformedOutDir = `${internalStorageDirectory}/transformed`;
  if (!fs.existsSync(transformedOutDir)) {
    console.info("Creating transformed output directory", transformedOutDir);
    fs.mkdirSync(transformedOutDir, {
      recursive: true,
    });
  }
};

module.exports = {
  uploadDataDirectory,
  internalStorageDirectory,
  videoProcessingBasePath,
  getStoragePathForInternalAsset,
  getStorgePathForUploadedAsset,
  checkAndCreateUploadDataDirectory,
  checkAndTransformedDataDirectory,
};
