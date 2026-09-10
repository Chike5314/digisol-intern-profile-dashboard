import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID, 
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: 'digisol-dashboard-auth.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: ['http://localhost:5173/','https://main.d3co7r5b8ec1sd.amplifyapp.com/', 'https://main.d3co7r5b8ec1sd.amplifyapp.com/workspace'],
          redirectSignOut: ['http://localhost:5173/','https://main.d3co7r5b8ec1sd.amplifyapp.com/', 'https://main.d3co7r5b8ec1sd.amplifyapp.com/workspace'],
          responseType: 'code'
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);