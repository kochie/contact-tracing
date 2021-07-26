import { gql } from "@apollo/client";

export const GET_USER_LOCATION_HISTORY = gql`
  query GetUserLocationHistory(
    $user_id: String!
    $nextToken: String
    $from: AWSDateTime
    $until: AWSDateTime
  ) {
    get_user_location_history(
      user_id: $user_id
      nextToken: $nextToken
      from: $from
      until: $until
    ) {
      items {
        user_id
        checkin_datetime
        location_id
      }
      nextToken
    }
  }
`;
