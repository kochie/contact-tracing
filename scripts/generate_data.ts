import * as gaussian from 'gaussian'

export const numberOfUsers = 10_000
export const numberOfLocations = 1_000
const averageLocationPerUser = 25
const startDate = new Date("2021-05-20T00:00:00+10:00")
const endDate = new Date("2021-05-30T00:00:00+10:00")

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function generateCheckins() {
    const dist = gaussian(averageLocationPerUser, 10)
    const checkins = []
    for (let user = 1; user < numberOfUsers; user++) {
        const number_locations_visited = dist.ppf(Math.random())

        let locations = Array.from({length: number_locations_visited}, () => ({
            location_id: getRandomInt(1, numberOfLocations+1),
            checkin_datetime: randomDate(startDate, endDate),
            user_id: user
        }))

        checkins.push(...locations)
    }
    return checkins
}

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
