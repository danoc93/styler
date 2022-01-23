import { ReactNode } from "react";
import styled from "styled-components";

export const BaseView = ({ children, title }: { children: ReactNode; title: string }) => (
  <StyledBaseView>
    <StyledLogo>
      <img alt="Logo" height="64" src="/assets/main-logo.png" />
      Video Styler
    </StyledLogo>
    <h2>{title}</h2>
    <div>{children}</div>
  </StyledBaseView>
);

const StyledBaseView = styled.div`
  padding: 24px;
  h2 {
    margin-bottom: 48px;
  }
`;

const StyledLogo = styled.h1`
  font-family: monospace;
  font-size: 3em;
`;
