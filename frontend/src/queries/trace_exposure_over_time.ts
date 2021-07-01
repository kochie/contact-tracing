import { gql } from "@apollo/client";

export const TRACE_EXPOSURE_OVER_TIME = gql`
  query TraceExposureOverTime(
    $user_id: String!
    $from: AWSDateTime
    $until: AWSDateTime
    $depth: Int
    $step: Int
  ) {
    trace_exposure_over_time(
      user_id: $user_id
      from: $from
      until: $until
      depth: $depth
      step: $step
    ) {
      links {
        latitude
        longitude
        location_id
        time
        target
        source
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
