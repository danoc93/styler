const { getDb } = require("../infrastructure/db");

/**
 * Style Service
 * Operations to get style information for style transfer operations.
 */

const getAllAvailableStyles = async () => {
  return await getDb().all("SELECT * FROM image_style");
};

const getStyleById = async (styleId) => {
  return await getDb().get("SELECT * FROM image_style where id = :id", { ":id": styleId });
};

module.exports = {
  getAllAvailableStyles,
  getStyleById,
};
