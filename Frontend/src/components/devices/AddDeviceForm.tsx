import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { buttonPrimary, inputClass } from "../common/ui";
export default function AddDeviceForm({
  adding,
  onAdd,
}: {
  adding: boolean;
  onAdd: (details: { name: string; address: string; type: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("API Endpoint");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !address.trim()) return;
    if (await onAdd({ name: name.trim(), address: address.trim(), type })) {
      setName("");
      setAddress("");
    }
  }
  return (
    <section className="mb-5 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Add a device</h2>
          <p className="mt-1 text-xs text-slate-400">
            Monitor an endpoint you are authorized to check
          </p>
        </div>
        <Plus size={21} className="text-sky-400" />
      </div>
      <form
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.5fr_0.8fr_auto]"
        onSubmit={(event) => void submit(event)}
      >
        <label className="block text-xs font-semibold text-slate-300">
          Device name
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Staging API"
            required
          />
        </label>
        <label className="block text-xs font-semibold text-slate-300">
          Endpoint URL
          <input
            className={inputClass}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="https://example.com"
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
        <button className={`${buttonPrimary} min-h-10`} type="submit" disabled={adding}>
          <Plus size={16} />
          {adding ? "Adding…" : "Add device"}
        </button>
      </form>
    </section>
  );
}
