import { useMemo } from "react";
import {
  ApolloClient,
  createHttpLink,
  from,
  InMemoryCache,
} from "@apollo/client";
import { Auth } from "aws-amplify";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { Output } from "../queries/common";

Auth.configure({
  userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
  region: process.env.NEXT_PUBLIC_REGION,
});

let apolloClient;

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        get_user_location_history: {
          keyArgs: ["user_id", "from", "until"],
          merge(
            existing: Output = { items: [], nextToken: "" },
            incoming: Output
          ) {
            // console.log("INCOMING", incoming)
            return {
              nextToken: incoming.nextToken,
              items: [...existing.items, ...incoming.items],
            };
          },
        },
      },
    },
  },
});

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL,
});

// const httpBatchLink = new BatchHttpLink({
//     uri:
//         "https://w4s3fpc2tfcizhptzix7d5qjam.appsync-api.ap-southeast-2.amazonaws.com/graphql",
// });

const authLink = setContext(async (request, { headers }) => {
  // get the authentication token from local storage if it exists
  // const { getAccessToken } = useAuth();
  Auth.configure({
    userPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_REGION,
  });
  let token;
  // console.log("HELO");
  try {
    const session = await Auth.currentSession();
    token = session.getAccessToken().getJwtToken();
  } catch {
    console.log("NO TOKEN!!!!");
  }
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      Authorization: token ? token : "",
    },
  };
});

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: from([
      onError((err) => {
        console.log(err);
      }),
      authLink,
      httpLink,
    ]),
    cache,

    name: "react-web-client",
    version: "1.3",
    queryDeduplication: false,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-first",
      },
    },
  });
}

export function initializeApollo(initialState = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();
    // Restore the cache using the data passed from getStaticProps/getServerSideProps
    // combined with the existing cached data
    _apolloClient.cache.restore({ ...existingCache, ...initialState });
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useApollo(initialState) {
  return useMemo(() => initializeApollo(initialState), [initialState]);
}
