import { type NextRequest, NextResponse } from "next/server"
import { connect, type NatsConnection, JSONCodec } from "nats.ws"

const jc = JSONCodec()

let natsClient: NatsConnection | null = null

async function getNatsClient() {
  if (!natsClient) {
    natsClient = await connect({ servers: process.env.NATS_SERVER })
  }
  return natsClient
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cameras = searchParams.get("cameras")?.split(",").map(Number) || []
  const venueNumber = searchParams.get("venue") || "13"

  const nc = await getNatsClient()

  const statusPromises = cameras.map(async (cameraNumber) => {
    const subscription = nc.subscribe(`venue${venueNumber}.caminq.camera${cameraNumber}`)
    const message = await subscription.next()
    subscription.unsubscribe()
    return { [cameraNumber]: jc.decode(message.data) }
  })

  try {
    const statuses = await Promise.all(statusPromises)
    return NextResponse.json(Object.assign({}, ...statuses))
  } catch (error) {
    console.error("Error fetching camera statuses:", error)
    return NextResponse.json({ error: "Failed to fetch camera statuses" }, { status: 500 })
  }
}

