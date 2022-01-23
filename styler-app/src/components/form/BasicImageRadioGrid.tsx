import styled from "styled-components";
import { apiBase } from "../../utils/apiManager";
import { IImageStyle } from "../../utils/interfaces";

export const BasicImageRadioGrid = ({
  styleList,
  onChange,
}: {
  styleList: IImageStyle[];
  onChange: (eventData: any) => any;
}) => {
  return (
    <fieldset id="style-group" onChange={onChange}>
      {styleList.length === 0 && <p>No Styles Available!</p>}
      <StyledStylePicker>
        {styleList.map((imageStyle) => (
          <StyledDemoContainer key={imageStyle.id}>
            <StyledImageDemo src={`${apiBase}/${imageStyle.imageUrl}`} />
            <p>{imageStyle.description}</p>
            <input type="radio" value={imageStyle.id} name="style-group" />
          </StyledDemoContainer>
        ))}
      </StyledStylePicker>
    </fieldset>
  );
};

const StyledImageDemo = styled.img`
  height: 128px;
  width: 128px;
`;

const StyledDemoContainer = styled.div`
  text-align: center;
  &:not(:last-child) {
    margin-right: 24px;
  }
  margin-bottom: 0 !important;
`;

const StyledStylePicker = styled.div`
  padding: 12px;
  display: flex;
  justify-content: "space-evenly";
`;
