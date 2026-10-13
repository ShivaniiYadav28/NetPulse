
import api from "./api";

export interface Device {
  id: string;
  name: string;
  address: string;
  type: string;
  status: string;
}

interface DevicesResponse {
  success: boolean;
  count: number;
  devices: Device[];
}

export async function getDevices(): Promise<Device[]> {
  const response = await api.get<DevicesResponse>("/devices");
  return response.data.devices;
}

export async function addDevice(device: {
  name: string;
  address: string;
  type?: string;
}): Promise<Device> {
  const response = await api.post<{ success: boolean; device: Device }>(
    "/devices",
    device
  );

  return response.data.device;
}
