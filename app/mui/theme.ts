import { createTheme } from "@mui/material";

// Create a theme instance.
const theme = createTheme({
  palette: {
    mode: "light",
  },
  components: {
    // Name of the component ⚛️
    MuiButtonBase: {
      defaultProps: {
        // The props to apply
        disableRipple: true, // No more ripple, on the whole application 💣!
      },
    },
  },
});

export default theme;
