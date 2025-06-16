import type { CameraSettings } from '../types'

export async function sendColorControlMessage(
  cameraNumber: number, 
  settings: CameraSettings, 
  url: string, 
  headers: Headers,
  onMessageSent?: (topic: string, message: any) => void
) {
  const colorControlMessage = {
    eventName: `colour-control.camera${cameraNumber}`,
    eventData: {
      changeexposuremode: "1",
      exposuremode: "manual",
      changewbmode: "1",
      whitebalancemode: "manual",
      wbcbgain: 54,
      wbcrgain: 54,
      colourmatrix: "1",
      saturation: 4,
      hue: 4,
      iris: Math.round(settings.iris),
      exposuregain: Math.round(settings.exposuregain),
      shutterspeed: Math.round(settings.shutterspeed),
      brightness: Math.round(settings.brightness)
    }
  }
  
  await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(colorControlMessage)
  })

  if (onMessageSent) {
    onMessageSent(`colour-control.camera${cameraNumber}`, colorControlMessage.eventData)
  }
}

export async function sendInquiryMessage(
  cameraNumber: number, 
  url: string, 
  headers: Headers,
  onMessageSent?: (topic: string, message: any) => void
) {
  const inquiryMessage = {
    eventName: `ptzcontrol.camera${cameraNumber}`,
    eventData: {
      inqcam: `${cameraNumber}`
    }
  }

  await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(inquiryMessage)
  })

  if (onMessageSent) {
    onMessageSent(`ptzcontrol.camera${cameraNumber}`, inquiryMessage.eventData)
  }
}
