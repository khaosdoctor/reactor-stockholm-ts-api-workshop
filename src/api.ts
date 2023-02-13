import express, { NextFunction, Request, Response } from 'express'
import { ZodError, z } from 'zod'
import { loadConfig } from './app-config'
const app = express()
const config = loadConfig()!
const stationCache = new Map<string, StopResponse['ResponseData']>()

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

interface StopResponse {
  StatusCode: number
  Message: null
  ExecutionTime: number
  ResponseData: {
    Name: string
    SiteId: string
    Type: Type
    X: string
    Y: string
    Products: null
  }[]
}

export enum Type {
  Station = "Station",
}


app.get('/times/:stationId', async (req, res, next) => {
  try {
    const schema = z.object({
      stationId: z.string().transform((val) => Number(val)),
    })
    const { stationId } = schema.parse(req.params)

    const apiCall = await fetch(`${config.apiUrl}/realtimedeparturesV4.json?key=${config.apiKey}&siteid=${stationId}&timewindow=60`)
    const data: StationInfo = await apiCall.json()

    res.json({
      stationId,
      results: data.ResponseData
    })
  } catch (err) {
    next(err)
  }
})

app.get('/stations', async (req: Request<never, any, never, { q: string }>, res, next) => {
  try {
    const schema = z.object({ q: z.string() })
    const { q } = schema.parse(req.query)

    if (stationCache.has(q)) {
      return res.json({
        query: q,
        results: stationCache.get(q)
      })
    }

    const apiCall = await fetch(`${config.apiUrl}/typeahead.json?key=${config.stopLookupApiKey}&searchstring=${q}&stationsonly=true&maxresults=10`)
    const stations: StopResponse = await apiCall.json()
    stationCache.set(q, stations.ResponseData)

    res.json({
      query: q,
      results: stations.ResponseData,
    })
  } catch (err) {
    next(err)
  }
})

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      message: err.message,
      errors: err.errors,
      cause: err.issues,
    })
  }
})

app.listen(config?.port, () => {
  console.log(`Server started on port ${config.port}`)
})
