import { UploadVideoView } from "./components/views/UploadVideoView";

import styled from "styled-components";
import { getActiveVideoProcessingTask } from "./utils/apiManager";
import { GlobalStyle } from "./styles/GlobalStyle";
import { VideoProcessingView } from "./components/views/VideoProcessingView";

export const App = () => {
  const activeVideoProcessingTask = getActiveVideoProcessingTask();
  return (
    <>
      <GlobalStyle />
      <StyledAppContainer>
        {activeVideoProcessingTask ? <VideoProcessingView /> : <UploadVideoView />}
      </StyledAppContainer>
    </>
  );
};

const StyledAppContainer = styled.div`
  margin: 24px;
  margin: 0 auto;
  width: 800px;
`;
