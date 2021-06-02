export interface CheckIns {
    user_id: string
    location_id: string
    checkin_datetime: string
}

export interface Output {
    items: CheckIns[]
    nextToken: string
}
