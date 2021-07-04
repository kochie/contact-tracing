import { gql } from "@apollo/client";

export const GET_LOCATION_ATTENDEES = gql`
  query GetLocationAttendees(
    $location_id: String!
    $nextToken: String
    $from: AWSDateTime
    $until: AWSDateTime
  ) {
    get_location_attendees(
      location_id: $location_id
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
