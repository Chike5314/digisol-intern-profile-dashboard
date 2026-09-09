import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { DashboardContent } from "./components/DashboardContent";

// eslint-disable-next-line react-refresh/only-export-components -- withAuthenticator is a HOC; fast refresh can't trace through it
function App({ signOut }) {
  return (
    <ToastProvider>
      <BrowserRouter>
        <DashboardContent signOut={signOut} />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default withAuthenticator(App, {
  signUpAttributes: ["email"],
  formFields: {
    signUp: {
      "custom:department": {
        order: 1,
        placeholder: "Enter Department Name (e.g. SoftwareEngineering)",
        label: "Department Name",
        isRequired: true,
      },
      "custom:role": {
        order: 2,
        placeholder: "Role (LEAD or MEMBER)",
        label: "Role",
        isRequired: true,
      },
    },
  },
});
