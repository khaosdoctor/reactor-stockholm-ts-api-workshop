import express from 'express'
import { ZodError, z } from 'zod'
import { loadConfig } from './app-config'
const app = express()
const config = loadConfig()!

type Deviation = {
  Text: string
  Consequence: 'CANCELLED' | 'INFORMATION' | null
  ImportanceLevel: number
}[]

interface TransportInfo {
  GroupOfLine: string
  TransportMode: string
  LineNumber: string
  Destination: string
  JourneyDirection: number
  StopAreaName: string
  StopAreaNumber: number
  StopPointNumber: number
  StopPointDesignation: string
  TimeTabledDateTime: Date
  ExpectedDateTime: Date
  DisplayTime: string
  JourneyNumber: number
  Deviations: Deviation[] | null
  SecondaryDestinationName?: null
}

interface StationInfo {
  ResponseData: {
    LatestUpdate: string
    DataAge: number
    Metros: TransportInfo[]
    Buses: TransportInfo[]
    Trains: TransportInfo[]
    Trams: TransportInfo[]
    Ships: TransportInfo[]
    StopPointDeviations: {
      StopInfo: {
        StopAreaNumber: number
        StopAreaName: string
        TransportMode: string
        GroupOfLine: string
      }
      Deviation: Deviation
    }
  }
}

app.get('/times/:stationId', async (req, res) => {
  try {
    const schema = z.object({
      stationId: z.string().transform((val) => Number(val)),
    })
    const { stationId } = schema.parse(req.params)

    const apiCall = await fetch(`${config.apiUrl}?key=${config.apiKey}&siteid=${stationId}&timewindow=60`)
    const data: StationInfo = await apiCall.json()

    res.json({
      stationId,
      results: data.ResponseData
    })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({
        message: err.message,
        errors: err.errors,
        cause: err.issues,
      })
    }
  }
})

app.listen(config?.port, () => {
  console.log(`Server started on port ${config.port}`)
})
