import { gql } from "@apollo/client";

export const TRACE_EXPOSURE_FLAT = gql`
  query TraceExposureFlat(
    $user_id: String!
    $from: AWSDateTime
    $until: AWSDateTime
  ) {
    trace_exposure_flat(user_id: $user_id, from: $from, until: $until) {
      links {
        source
        target
        location_id
        time
      }
      nodes {
        user_id
      }
      locations {
        latitude
        longitude
        location_id
      }
    }
  }
`;
