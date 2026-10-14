import { useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { Device } from "../../types/device";
import { buttonPrimary, buttonSecondary, inputClass } from "../common/ui";

type DeviceDetails = { name: string; address: string; type: string };

type EditDeviceFormProps = {
  device: Device;
  saving: boolean;
  onClose: () => void;
  onSave: (device: Device, details: DeviceDetails) => Promise<boolean>;
};

function EditDeviceForm({ device, saving, onClose, onSave }: EditDeviceFormProps) {
  const [name, setName] = useState(device.name);
  const [address, setAddress] = useState(device.address);
  const [type, setType] = useState(device.type);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !address.trim()) return;

    const saved = await onSave(device, {
      name: name.trim(),
      address: address.trim(),
      type,
    });

    if (saved) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="my-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="np-edit-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="np-edit-title" className="text-lg font-bold text-slate-100">
              Edit device
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Update the endpoint details for {device.name}.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:text-white disabled:opacity-50"
            type="button"
            aria-label="Close edit form"
            disabled={saving}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <form
          className="mt-5 grid grid-cols-1 gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <label className="block text-xs font-semibold text-slate-300">
            Device name
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Endpoint URL
            <input
              className={inputClass}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              type="url"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Type
            <select
              className={inputClass}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>API Endpoint</option>
              <option>Web Server</option>
              <option>Website</option>
              <option>Custom Endpoint</option>
            </select>
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button
              className={buttonSecondary}
              type="button"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className={buttonPrimary} type="submit" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function EditDeviceModal({
  device,
  saving,
  onClose,
  onSave,
}: {
  device: Device | null;
  saving: boolean;
  onClose: () => void;
  onSave: (device: Device, details: DeviceDetails) => Promise<boolean>;
}) {
  if (!device) return null;

  return (
    <EditDeviceForm
      key={device.id}
      device={device}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
