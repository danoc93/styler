import React from "react";
import styled from "styled-components";
import { apiBase, getActiveVideoProcessingTask, stopActiveVideoProcessingTask } from "../../utils/apiManager";
import { StyledError, StyledNeutral, StyledSuccess } from "../text/Messages";
import { BaseView } from "./BaseView";

enum ProcessingState {
  Processing = 0,
  Errored = 1,
  Successful = 2,
}

interface IVideoProcessingState {
  status: ProcessingState;
  videoSourceUrl?: string;
  details?: string;
  additionalData: { styleAsset?: string };
}

const stopActiveTask = () => {
  stopActiveVideoProcessingTask();
  window.location.reload();
};

export const VideoProcessingView = () => {
  const [activeState, setActiveState] = React.useState<ProcessingState | null>(ProcessingState.Processing);
  const [additionalDetails, setAdditionalDetails] = React.useState<string>();
  const [videoSource, setVideoSource] = React.useState<string>();
  const [styleImage, setStyleImage] = React.useState<string>();

  const fetchTimer = React.useRef<any>(null);

  const getLatestStateOfProcessingTask = async () => {
    const taskId = getActiveVideoProcessingTask();
    if (!taskId) {
      return;
    }
    try {
      const response = await fetch(`${apiBase}/get_latest_video_state/${taskId}`, {
        method: "get",
      });
      const { status, videoSourceUrl, details, additionalData }: IVideoProcessingState = await response.json();
      setActiveState(status);
      setAdditionalDetails(details);
      setVideoSource(videoSourceUrl);
      setStyleImage(additionalData.styleAsset);
    } catch (e) {
      // Error in the front end.
      setAdditionalDetails(e.message);
      setActiveState(ProcessingState.Errored);
    }
  };

  React.useEffect(() => {
    fetchTimer.current = setInterval(() => getLatestStateOfProcessingTask(), 1000);
    return () => {
      clearInterval(fetchTimer.current);
    };
  }, []);

  React.useEffect(() => {
    if (activeState !== ProcessingState.Processing && fetchTimer.current) {
      clearInterval(fetchTimer.current);
    }
  }, [activeState]);

  return (
    <BaseView title="Video Processing Result">
      {activeState === ProcessingState.Processing && (
        <StyledNeutral>Video is Still Being Processed. Please Wait...</StyledNeutral>
      )}
      {activeState === ProcessingState.Errored && (
        <StyledError>An Error Occurred While Processing the Video.</StyledError>
      )}
      {activeState === ProcessingState.Successful && (
        <StyledSuccess>Video Has Been Succesfully Processed!</StyledSuccess>
      )}
      {additionalDetails && <p>{additionalDetails}</p>}
      <p>{`Task ID: ${getActiveVideoProcessingTask()}`}</p>
      {activeState === ProcessingState.Successful && videoSource && (
        <>
          <video width="728" controls autoPlay>
            <source src={`${apiBase}/${videoSource}`} type="video/mp4" />
          </video>
          <StyledBottomContainer>
            <a href={`${apiBase}/${videoSource}`} download={`${getActiveVideoProcessingTask()}.mp4`}>
              Download Created Assets
            </a>
            {styleImage && <StyledImageDemo src={`data:image/png;base64,${styleImage}`} alt="Red dot" />}
          </StyledBottomContainer>
        </>
      )}
      <StyledButton onClick={stopActiveTask}>Stop Active Video Processing Task</StyledButton>
    </BaseView>
  );
};

const StyledButton = styled.button`
  margin-top: 24px;
`;

const StyledBottomContainer = styled.div`
  padding: 24px;
  display: flex;
  a {
    flex: 1;
  }
`;

const StyledImageDemo = styled.img`
  height: 128px;
  width: 128px;
`;
