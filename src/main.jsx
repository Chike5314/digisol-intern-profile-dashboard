import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import '@aws-amplify/ui-react/styles.css'
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_yU7oZ1G3Y', // From CDK CfnOutput
      userPoolClientId: '2o97s1ukm80o2emrv8tie9aar9' // From CDK CfnOutput
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)