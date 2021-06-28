import React from "react";
import { Auth } from "aws-amplify";
import { ApolloProvider } from "@apollo/client";
import { useApollo } from "../lib/apolloClient";
import "tailwindcss/tailwind.css";

Auth.configure({
  userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
  // identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
  region: process.env.NEXT_PUBLIC_REGION,
  // endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
});

function MyApp({ Component, pageProps }) {
  const apolloClient = useApollo(pageProps.initialApolloState);

  return (
    <ApolloProvider client={apolloClient}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

export default MyApp;
