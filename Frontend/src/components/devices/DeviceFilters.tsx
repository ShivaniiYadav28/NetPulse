import { buttonSecondary, inputClass } from "../common/ui";
export default function DeviceFilters({
  search,
  status,
  type,
  types,
  onSearch,
  onStatus,
  onType,
  onClear,
}: {
  search: string;
  status: string;
  type: string;
  types: string[];
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onType: (value: string) => void;
  onClear: () => void;
}) {
  const active = Boolean(search || status !== "All" || type !== "All");
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          className={inputClass}
          type="search"
          placeholder="Search by device name or URL..."
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          aria-label="Search devices"
        />
        <select
          className={inputClass}
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          aria-label="Filter devices by status"
        >
          <option value="All">All statuses</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
        <select
          className={inputClass}
          value={type}
          onChange={(event) => onType(event.target.value)}
          aria-label="Filter devices by type"
        >
          <option value="All">All device types</option>
          {types.map((deviceType) => (
            <option key={deviceType} value={deviceType}>
              {deviceType}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <div className="mb-3 flex justify-end">
          <button type="button" className={buttonSecondary} onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
