import React, { FormEvent } from "react";
import styled from "styled-components";
import { apiBase, setActiveVideoProcessingTask } from "../../utils/apiManager";
import { IImageStyle } from "../../utils/interfaces";
import { BasicImageRadioGrid } from "../form/BasicImageRadioGrid";
import { StyledError, StyledNeutral } from "../text/Messages";
import { BaseView } from "./BaseView";

enum Operation {
  GRAYSCALE = "grayscale",
  STYLE_TRANSFER = "style-transfer",
}

export const UploadVideoView = () => {
  const [selectedVideo, setSelectedVideo] = React.useState<File | null>(null);
  const [selectedImageStyle, setSelectedImageStyle] = React.useState<string>();
  const [op, setOp] = React.useState<Operation>(Operation.STYLE_TRANSFER);
  const [customImageStyle, setCustomImageStyle] = React.useState<File | null>(null);
  const [maxDimensionScale, setMaxDimensionScale] = React.useState<number>(500);
  const [scalingMaxStyle, setScalingMaxStyle] = React.useState<number>(0);
  const [dropoutRate, setDroputRate] = React.useState<number>(30);
  const [error, setError] = React.useState<string | null>(null);
  const [submissionInProgress, setSubmissionInProgress] = React.useState(false);

  const videoRef = React.useRef<any>();
  const videoTempPath = React.useMemo(
    () => (selectedVideo ? URL.createObjectURL(selectedVideo) : null),
    [selectedVideo]
  );

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoTempPath]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedVideo === null || (op === Operation.STYLE_TRANSFER && !customImageStyle && !selectedImageStyle)) {
      setError("Missing fields for video submission.");
      return;
    }
    setSubmissionInProgress(true);
    const formData = new FormData();
    if (selectedVideo) {
      formData.append("videoSource", selectedVideo);
    }
    if (selectedImageStyle) {
      formData.append("selectedImageStyle", selectedImageStyle);
    }
    if (customImageStyle) {
      formData.append("customImageStyle", customImageStyle);
    }
    if (maxDimensionScale) {
      formData.append("scalingMaxDimension", maxDimensionScale.toString());
    }
    if (scalingMaxStyle) {
      formData.append("scalingMaxStyle", scalingMaxStyle.toString());
    }
    if (dropoutRate) {
      const rate = (dropoutRate ?? 0) / 100;
      formData.append("frameDropRate", rate.toString());
    }
    // For now assume this is the only supported method. However the backend has been made flexible.
    formData.append("processingMethod", op);
    try {
      const response = await fetch(`${apiBase}/upload_video_for_processing`, { method: "post", body: formData });
      const dataResponse = await response.json();
      setActiveVideoProcessingTask(dataResponse.queueTaskId);
      window.location.reload();
    } catch (e) {
      setError("Something wrong went while submitting the video for processing!");
    }
    setSubmissionInProgress(false);
  };

  return (
    <BaseView title="Transform the appeareance of any video!">
      <StyledForm onSubmit={handleSubmit}>
        <StyledSection>
          <h3>Pick a video to transform</h3>
          <VideoSelectContainer>
            <input
              accept="video/mp4"
              type="file"
              onChange={(e) => setSelectedVideo(e.target.files ? e.target.files[0] : null)}
            />
            {videoTempPath && (
              <video width="312" controls ref={videoRef}>
                <source src={videoTempPath} type="video/mp4" />
              </video>
            )}
          </VideoSelectContainer>
        </StyledSection>
        <StyledSection>
          <h3>Pick a transformation for your video</h3>
          <fieldset id="settings-grayscale" onChange={(e: any) => setOp(e.target.value)}>
            <input type="radio" name="mode-op" value={Operation.STYLE_TRANSFER} defaultChecked />
            Video Style Transfer &nbsp; &nbsp;
            <input type="radio" name="mode-op" value={Operation.GRAYSCALE} />
            Grayscale
          </fieldset>
        </StyledSection>
        {op === Operation.STYLE_TRANSFER && (
          <StyleTransferConfiguration
            setError={setError}
            setCustomImageStyle={setCustomImageStyle}
            setScalingMaxStyle={setScalingMaxStyle}
            scalingMaxStyle={scalingMaxStyle}
            setSelectedImageStyle={setSelectedImageStyle}
          />
        )}
        <StyledSection>
          <h3>PROCESSING Parameters</h3>
          <Introduction>These parameters enable to explore tradeoffs between quality and processing time.</Introduction>
          <br />
          <StyledOptionLabel>Maximum Dimension Scale</StyledOptionLabel>
          <p>
            Scale down the target video by setting the largest dimension to this value and preserving the aspect ratio.
            <br />
          </p>
          <StyledNumberInput
            type="number"
            name="max-dimension-scale"
            value={maxDimensionScale as any}
            min="0"
            max="1920"
            step="1"
            onChange={(e: any) => setMaxDimensionScale(Number(e.target.value))}
          />
          &nbsp;px
          <StyledSideSmall>A value of 0 will preserve the original dimensions.</StyledSideSmall>
          <StyledOptionLabel>Frame Dropout Rate</StyledOptionLabel>
          <p>
            The rate at which frames will be dropped as a means of compression.
            <br />
          </p>
          <input
            type="range"
            name="dropout-rate"
            min="0"
            max="100"
            value={dropoutRate as any}
            onChange={(e: any) => setDroputRate(Number(e.target.value))}
          />
          <b>{dropoutRate}</b>
          <StyledSideSmall>A rate of 0 will not drop any frames.</StyledSideSmall>
        </StyledSection>
        <StyledSection>
          <h3>Process video</h3>
          <Introduction>
            Submitting the video will put it in a queue for processing. Once completed a link will become available.{" "}
          </Introduction>
          {error && <StyledError>{`ERROR: ${error}`}</StyledError>}
          {submissionInProgress && <StyledNeutral>Submitting for processing. Please wait...</StyledNeutral>}
          <input type="submit" value="Submit Video" />
        </StyledSection>
      </StyledForm>
    </BaseView>
  );
};

// TODO: Make this a React Context instead.
interface IStyleTransferConfigProps {
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedImageStyle: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCustomImageStyle: React.Dispatch<React.SetStateAction<File | null>>;
  setScalingMaxStyle: React.Dispatch<React.SetStateAction<number>>;
  scalingMaxStyle?: number;
}
export const StyleTransferConfiguration = ({
  setError,
  setSelectedImageStyle,
  setCustomImageStyle,
  setScalingMaxStyle,
  scalingMaxStyle,
}: IStyleTransferConfigProps) => {
  const [availableImagesStyles, setAvailabelStyles] = React.useState<IImageStyle[]>([]);

  React.useEffect(() => {
    const loadStyles = async () => {
      try {
        const response = await fetch(`${apiBase}/get_available_styles`, { method: "get" });
        const styleData = await response.json();
        setAvailabelStyles(styleData);
      } catch (e) {
        setError("Error fetching style list from API");
      }
    };
    loadStyles();
  }, []);

  return (
    <>
      <StyledSection>
        <h3>Pick a style for the video</h3>
        <BasicImageRadioGrid
          styleList={availableImagesStyles}
          onChange={(e) => setSelectedImageStyle(e.target.value)}
        />
        <p>Alternatively, you can upload a custom style source.</p>
        <input
          accept="image/*"
          type="file"
          onChange={(e) => setCustomImageStyle(e.target.files ? e.target.files[0] : null)}
        />
      </StyledSection>
      <StyledSection>
        <h3>Style Transfer Parameters</h3>
        <Introduction>These parameters enable to explore tradeoffs between quality and processing time.</Introduction>
        <br />
        <StyledOptionLabel>Style Target Maximum Dimension Scale</StyledOptionLabel>
        <p>
          Scale down the target style by setting the largest dimension to this value and preserving the aspect ratio.
          <br />
        </p>
        <StyledNumberInput
          type="number"
          name="max-dimension-scale-style"
          value={scalingMaxStyle as any}
          min="0"
          max="800"
          step="1"
          onChange={(e: any) => setScalingMaxStyle(Number(e.target.value))}
        />
        &nbsp;px
        <StyledSideSmall>A value of 0 will result in a default of 400px.</StyledSideSmall>
      </StyledSection>
    </>
  );
};

const StyledSection = styled.div`
  label {
    display: block;
    margin-bottom: 12px;
  }
  h3 {
    text-transform: uppercase;
  }
`;

const StyledForm = styled.form`
  div:not(:last-child) {
    margin-bottom: 36px;
  }
  margin-bottom: 248px;
`;

const StyledNumberInput = styled.input`
  width: 64px;
`;

const Introduction = styled.p`
  font-size: 14px;
`;

const StyledOptionLabel = styled.strong`
  display: block;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const StyledSideSmall = styled.small`
  margin-left: 24px;
  background-color: #f3dfa2;
  color: #231f20;
  padding: 2px 6px 2px 6px;
`;

const VideoSelectContainer = styled.div`
  display: flex;
  align-items: center;
  input {
    flex: 1;
  }
`;
