import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: Arial;
    color: white;
    background-color: #231F20;
    h3 {
      color :#efe6dd;
      font-weight: normal;
    }
    h1 {
      color: #f3dfa2;
    }
    button, input {
      font-size: 1em;
    }
    a {
      color: #efe6dd
    }
  }
`;
