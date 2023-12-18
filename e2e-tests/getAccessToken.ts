import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const randSeq = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "");

export const getAccessToken = async ({
  userPoolId,
  userPoolClientId,
}: {
  userPoolId: string;
  userPoolClientId: string;
}) => {
  const username = randSeq();
  const email = `${username}@example.com`;
  const TemporaryPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`;
  const newPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`;

  var cognitoidentityserviceprovider = new CognitoIdentityProviderClient();

  // creating a user for testing the api
  await cognitoidentityserviceprovider.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "True" },
      ],
      TemporaryPassword,
    })
  );
  /*
      The session that should be passed both ways in challenge-response calls to the service. 
      If AdminInitiateAuth or AdminRespondToAuthChallenge API call determines that the caller must
      pass another challenge, they return a session with another challenge parameter. 
      This session should be passed as it is to the next AdminRespondToAuthChallenge API call 
    */

  const { Session } = await cognitoidentityserviceprovider.send(
    new AdminInitiateAuthCommand({
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: TemporaryPassword,
      },
    })
  );

  await cognitoidentityserviceprovider.send(
    new AdminRespondToAuthChallengeCommand({
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
      Session: Session ?? "",
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: newPassword,
      },
    })
  );
  /*
      The result of the authentication response. This is only returned if the caller doesn't 
      need to pass another challenge. If the caller does need to pass another challenge before 
      it gets tokens, ChallengeName, ChallengeParameters, and Session are returned.
    */
  const { AuthenticationResult } = await cognitoidentityserviceprovider.send(
    new AdminInitiateAuthCommand({
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: newPassword,
      },
    })
  );
  return AuthenticationResult?.IdToken;
};
