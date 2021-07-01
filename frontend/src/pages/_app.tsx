import React, { useEffect } from "react";
import { Auth } from "aws-amplify";
import { ApolloProvider } from "@apollo/client";
import { useApollo } from "../lib/apolloClient";
import "tailwindcss/tailwind.css";
import { useRouter } from "next/router";
import * as Fathom from "fathom-client";

Auth.configure({
  userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
  // identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
  region: process.env.NEXT_PUBLIC_REGION,
  // endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
});

function MyApp({ Component, pageProps }) {
  const apolloClient = useApollo(pageProps.initialApolloState);
  const router = useRouter();

  useEffect(() => {
    // Initialize Fathom when the app loads
    // Example: yourdomain.com
    //  - Do not include https://
    //  - This must be an exact match of your domain.
    //  - If you're using www. for your domain, make sure you include that here.
    Fathom.load("JZRNKPYU", {
      includedDomains: ["ct.vercel.app"],
      url: "kite.kochie.io"
    });

    function onRouteChangeComplete() {
      Fathom.trackPageview();
    }
    // Record a pageview when route changes
    router.events.on("routeChangeComplete", onRouteChangeComplete);

    // Unassign event listener
    return () => {
      router.events.off("routeChangeComplete", onRouteChangeComplete);
    };
  }, [router.events]);

  return (
    <ApolloProvider client={apolloClient}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

export default MyApp;
