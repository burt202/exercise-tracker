import axios from "axios"
import {endOfMonth, format, startOfMonth} from "date-fns"

// go to https://www.strava.com/oauth/authorize?client_id=102826&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=activity:read_all
// take code out of the url

const clientId = "102826"
const clientSecret = process.env.CLIENT_SECRET
const code = ""

const YEAR = 2023
const MONTH = 1
const ITEMS_PER_PAGE = 50

const after = format(startOfMonth(new Date(YEAR, MONTH - 1)), "t")
const before = format(endOfMonth(new Date(YEAR, MONTH - 1)), "t")

function round(decimals: number, num: number) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

function pad(number: number) {
  return number < 10 ? `0${number}` : number
}

function formatMovingTime(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60)

  const seconds = totalSeconds % 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function getType(activity: Activity) {
  if (activity.manual && activity.type === "Run") {
    return "Treadmill"
  }

  return activity.type
}

function getPace(type: string, distance: number, movingTime: number) {
  if (type === "Run") {
    const secondsPerKilometer = movingTime / distance
    const totalMinutes = Math.floor(secondsPerKilometer / 60)

    const seconds = round(0, secondsPerKilometer % 60)

    return `${totalMinutes}:${pad(seconds)}/km`
  }

  if (type === "Ride" || type === "VirtualRide") {
    return `${round(1, distance / (movingTime / 3600))}km/h`
  }

  return "---"
}

interface Error {
  response: {
    data: unknown
  }
}

interface TokenResponse {
  data: {
    access_token: string
  }
}

interface Activity {
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
  manual: boolean
}

interface ActivitiesResponse {
  data: Array<Activity>
}

axios
  .post("https://www.strava.com/oauth/token", {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  })
  .then(function (response: TokenResponse) {
    const url = `https://www.strava.com/api/v3/athlete/activities?before=${before}&after=${after}&per_page=${ITEMS_PER_PAGE}&access_token=${response.data.access_token}`

    axios
      .get(url)
      .then(function (response: ActivitiesResponse) {
        const mapped = response.data.reverse().map((a) => {
          const type = getType(a)
          const date = format(new Date(a.start_date), "MMM dd")
          const distance = round(2, a.distance / 1000)
          const time = formatMovingTime(a.moving_time)
          const pace = getPace(a.type, distance, a.moving_time)

          return `${type},${date},${distance},${time},${pace}`
        })

        console.log("data", mapped)
      })
      .catch(function (error: Error) {
        console.log("Activities Error", error.response.data)
      })
  })
  .catch(function (error: Error) {
    console.log("Token Error", error.response.data)
  })
