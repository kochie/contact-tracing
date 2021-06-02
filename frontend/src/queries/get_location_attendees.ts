import { gql } from "@apollo/client";

export const GET_LOCATION_ATTENDEES = gql`
    query GetLocationAttendees($location_id: String!, $nextToken: String) {
        get_location_attendees(location_id: $location_id, nextToken: $nextToken) {
            items {
                user_id
                checkin_datetime
                location_id
            }
            nextToken
        }
    }
`;
