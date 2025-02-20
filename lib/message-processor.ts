import { connect, type NatsConnection, JSONCodec } from "nats.ws"

const jc = JSONCodec()

let natsClient: NatsConnection | null = null

async function getNatsClient() {
  if (!natsClient) {
    natsClient = await connect({ servers: process.env.NATS_SERVER })
  }
  return natsClient
}

export async function processCameraMessages(sliderPosition: number, cameras: number[], maxMessages = 5) {
  const nc = await getNatsClient()

  // Create message batch
  const messages = cameras.flatMap((cameraNumber) => {
    const colourControlMessage = {
      eventName: `colour-control.camera${cameraNumber}`,
      eventData: {
        exposuremode: "manual",
        iris: "1.0",
        exposuregain: "0",
        shutterspeed: "1/60",
        brightness: sliderPosition.toString(),
      },
    }

    const inquiryMessage = {
      eventName: `ptzcontrol.camera${cameraNumber}`,
      eventData: {
        inqcam: `camera_${cameraNumber}`,
      },
    }

    return [
      nc.publish("colour-control", jc.encode(colourControlMessage)),
      nc.publish("ptzcontrol", jc.encode(inquiryMessage)),
    ]
  })

  // Process messages in batches of maxMessages
  for (let i = 0; i < messages.length; i += maxMessages) {
    const batch = messages.slice(i, i + maxMessages)
    try {
      await Promise.all(batch)
      console.log(`Processed batch ${i / maxMessages + 1}`)
    } catch (error) {
      console.error("Error sending messages:", error)
      throw error
    }
  }
}

