import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_lNbFLaOt8', // Paste UserPoolId from cdk deploy output
      userPoolClientId: '544n8jqtfrcbq67q5ldo8f3ruk' // Paste UserPoolClientId from cdk deploy output
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);