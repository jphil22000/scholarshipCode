import { Amplify } from 'aws-amplify'

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
const oauthDomain = import.meta.env.VITE_COGNITO_OAUTH_DOMAIN

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

if (userPoolId && clientId) {
  const config = {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId: clientId,
      },
    },
  }
  if (oauthDomain) {
    const origin = getOrigin()
    config.Auth.Cognito.loginWith = {
      oauth: {
        domain: oauthDomain,
        redirectSignIn: [origin + '/callback', 'http://localhost:3000/callback'],
        redirectSignOut: [origin, 'http://localhost:3000'],
        responseType: 'code',
        scopes: ['openid', 'email', 'profile'],
      },
    }
  }
  Amplify.configure(config)
}

export { userPoolId, clientId, oauthDomain }
