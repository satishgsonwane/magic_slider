import { type NextRequest, NextResponse } from "next/server";
import { connect, type NatsConnection, type Msg, type NatsError, JSONCodec } from "nats.ws";
import { CameraStatusResponse } from '@/types/api';

const jc = JSONCodec();

let natsClient: NatsConnection | null = null;

async function getNatsClient() {
  if (!natsClient) {
    const server = process.env.NATS_SERVER;
    if (!server) {
      throw new Error('NATS server URL not configured');
    }
    natsClient = await connect({ servers: server });
  }
  return natsClient;
}

export async function GET(request: NextRequest): Promise<NextResponse<CameraStatusResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cameras = searchParams.get("cameras")?.split(",").map(Number) || [];
    const venueNumber = searchParams.get("venue") || "13";

    if (cameras.length === 0) {
      return NextResponse.json({ 
        error: "No cameras specified",
        status: 400
      });
    }

    const nc = await getNatsClient();

    const statusPromises = cameras.map(async (cameraNumber) => {
      const subscription = nc.subscribe(`venue${venueNumber}.caminq.camera${cameraNumber}`);
      return new Promise<{ [key: string]: unknown }>((resolve) => {
        subscription.callback = (err: NatsError | null, msg: Msg) => {
          if (err) {
            subscription.unsubscribe();
            throw err;
          }
          subscription.unsubscribe();
          resolve({ [cameraNumber]: jc.decode(msg.data) });
        };
      });
    });

    const statuses = await Promise.all(statusPromises);
    return NextResponse.json({
      data: Object.assign({}, ...statuses),
      status: 200
    });
  } catch (error) {
    console.error("Error fetching camera statuses:", error);
    return NextResponse.json({ 
      error: "Failed to fetch camera statuses",
      status: 500
    });
  }
}
