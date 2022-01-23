export const apiBase = "http://localhost:3500";

export const getActiveVideoProcessingTask = () => localStorage.getItem(processingJobIdentifier) ?? null;
export const setActiveVideoProcessingTask = (taskId: string) => localStorage.setItem(processingJobIdentifier, taskId);
export const stopActiveVideoProcessingTask = () => localStorage.clear();

const processingJobIdentifier = "style-processing-queue-id";
