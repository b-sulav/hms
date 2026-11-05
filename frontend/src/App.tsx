import { useEffect, useState, useCallback, useRef } from "react";

type Page = "Dashboard" | "Guests" | "Rooms" | "Room Types" | "Reservations";
type RecordItem = { id?: number; [key: string]: any };

const getItemId = (item?: RecordItem) => {
  if (!item) return undefined;
  return item.id ?? item.pk ?? item.room_no ?? item.room_id ?? item.guest_id;
};

const getApiErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      if (typeof data === "string") return data;
      if (data.detail) return String(data.detail);
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const value = data[firstKey];
        if (Array.isArray(value) && value.length > 0) return String(value[0]);
        if (typeof value === "string") return value;
      }
      return JSON.stringify(data);
    } catch {
    }
  }
  const text = await response.text();
  return text.split("\n")[0] || `Error (${response.status})`;
};

export default function App() {
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  const [page, setPage] = useState<Page>("Dashboard");
  const [guests, setGuests] = useState<RecordItem[]>([]);
  const [rooms, setRooms] = useState<RecordItem[]>([]);
  const [roomTypes, setRoomTypes] = useState<RecordItem[]>([]);
  const [reservations, setReservations] = useState<RecordItem[]>([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ page: Page; item?: RecordItem } | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickBookAvailableRooms, setQuickBookAvailableRooms] = useState<RecordItem[]>([]);
  const [quickBookCheckIn, setQuickBookCheckIn] = useState(todayStr);
  const [quickBookCheckOut, setQuickBookCheckOut] = useState(tomorrowStr);
  const [quickBookGuests, setQuickBookGuests] = useState(1);
  const [quickBookGuestMode, setQuickBookGuestMode] = useState<'new' | 'existing'>('new');
  const [quickBookSelectedGuestId, setQuickBookSelectedGuestId] = useState<number | ''>('');
  const [quickBookGuestSearch, setQuickBookGuestSearch] = useState('');
  const [quickBookDropdownOpen, setQuickBookDropdownOpen] = useState(false);
  const quickBookGuestDropdownRef = useRef<HTMLDivElement>(null);
  const [quickBookFname, setQuickBookFname] = useState('');
  const [quickBookLname, setQuickBookLname] = useState('');
  const [quickBookPhone, setQuickBookPhone] = useState('');
  const [quickBookEmail, setQuickBookEmail] = useState('');
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  useEffect(() => {
    if (!quickBookOpen || !token) return;
    const fetchAvailable = async () => {
      try {
        const resp = await fetch("/api/reservation/check-availability/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            num_guests: quickBookGuests,
            check_in: quickBookCheckIn,
            check_out: quickBookCheckOut,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setQuickBookAvailableRooms(data);
        } else {
          setQuickBookAvailableRooms([]);
        }
      } catch {
        setQuickBookAvailableRooms([]);
      }
    };
    fetchAvailable();
  }, [quickBookOpen, quickBookCheckIn, quickBookCheckOut, quickBookGuests, token]);

  useEffect(() => {
    if (quickBookOpen) {
      setQuickBookGuestMode('new');
      setQuickBookSelectedGuestId('');
      setQuickBookGuestSearch('');
      setQuickBookDropdownOpen(false);
      setQuickBookFname('');
      setQuickBookLname('');
      setQuickBookPhone('');
      setQuickBookEmail('');
    }
  }, [quickBookOpen]);

  useEffect(() => {
    if (!quickBookDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (quickBookGuestDropdownRef.current && !quickBookGuestDropdownRef.current.contains(e.target as Node)) {
        setQuickBookDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [quickBookDropdownOpen]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const login = async (username: string, password: string) => {
    setError(null);
    setErrorModal(null);
    try {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        const authToken = data.token as string;
        setToken(authToken);
        localStorage.setItem("auth_token", authToken);
        setIsLoggedIn(true);
        await loadAllData(authToken);
      } else {
        const errData = await response.text();
        setErrorModal(errData || "Login failed");
      }
    } catch {
      setErrorModal("Network error: Could not reach Django server.");
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout/", {
          method: "POST",
          headers: { "Authorization": `Token ${token}` },
        });
      }
    } catch {
    }
    setIsLoggedIn(false);
    setToken(null);
    localStorage.removeItem("auth_token");
    setGuests([]);
    setRooms([]);
    setRoomTypes([]);
    setReservations([]);
  };

  const getEndpoints = (p: Page, id?: number | string) => {
    switch (p) {
      case "Guests":
        return id !== undefined ? `/api/guest/${id}/` : `/api/guest/`;
      case "Reservations":
        return id !== undefined ? `/api/reservation/${id}/` : `/api/reservation/`;
      case "Rooms":
        return id !== undefined ? `/api/room/${id}/` : `/api/room/`;
      case "Room Types":
        return id !== undefined ? `/api/room/types/${id}/` : `/api/room/types/`;
      default:
        return "";
    }
  };

  const fields: Record<Page, { key: string; label: string; type?: string; options?: { value: any; label: string }[] }[]> = {
    Dashboard: [],
    Guests: [
      { key: "fname", label: "First name" },
      { key: "lname", label: "Last name" },
      { key: "phone", label: "Phone number", type: "tel" },
      { key: "email", label: "Email", type: "email" },
    ],
    Rooms: [
      { key: "room_no", label: "Room number" },
      {
        key: "room_type",
        label: "Room type",
        options: roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
      },
      {
        key: "status",
        label: "Status",
        options: [
          { value: "Available", label: "Available" },
          { value: "Reserved", label: "Reserved" },
          { value: "Occupied", label: "Occupied" },
          { value: "Maintenance", label: "Maintenance" },
        ],
      },
    ],
    "Room Types": [
      { key: "name", label: "Name" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "price", label: "Price per night", type: "number" },
    ],
    Reservations: [
      {
        key: "guest",
        label: "Guest",
        options: guests.map((g) => ({
          value: getItemId(g),
          label: `${g.fname || ""} ${g.lname || ""}`.trim() || `Guest #${getItemId(g)}`,
        })),
      },
      {
        key: "room",
        label: "Room",
        options: rooms.map((r) => ({
          value: getItemId(r),
          label: `Room ${r.room_no || getItemId(r)}`,
        })),
      },
      { key: "check_in", label: "Check-in date", type: "date" },
      { key: "check_out", label: "Check-out date", type: "date" },
      {
        key: "status",
        label: "Status",
        options: [
          { value: "Confirmed", label: "Confirmed" },
          { value: "Checked In", label: "Checked In" },
          { value: "Checked Out", label: "Checked Out" },
          { value: "Cancelled", label: "Cancelled" },
        ],
      },
    ],
  };

  const loadAllData = useCallback(async (authToken?: string | null) => {
    setLoading(true);
    setError(null);
    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Token ${authToken}`;
    }
    try {
      const [resGuests, resRooms, resTypes, resReservations] = await Promise.all([
        fetch("/api/guest/", { headers }),
        fetch("/api/room/", { headers }),
        fetch("/api/room/types/", { headers }),
        fetch("/api/reservation/", { headers }),
      ]);

      if (resGuests.ok) setGuests(await resGuests.json());
      if (resRooms.ok) setRooms(await resRooms.json());
      if (resTypes.ok) setRoomTypes(await resTypes.json());
      if (resReservations.ok) setReservations(await resReservations.json());
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorModal("Failed to load data from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadAllData();
    }
  }, [isLoggedIn, loadAllData]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;

    const form = new FormData(event.currentTarget);
    const rawValues = Object.fromEntries(form.entries());

    const formattedPayload: Record<string, any> = {};
    Object.entries(rawValues).forEach(([key, val]) => {
      if (["guest", "room", "room_type", "capacity", "room_no"].includes(key) && val !== "") {
        formattedPayload[key] = isNaN(Number(val)) ? val : Number(val);
      } else if (key === "price" && val !== "") {
        formattedPayload[key] = parseFloat(String(val).replace(/[^0-9.]/g, "")) || val;
      } else {
        formattedPayload[key] = val;
      }
    });

    if (formattedPayload.email === "") formattedPayload.email = "natura@walkin";

    const itemId = getItemId(modal.item);
    const isEditing = itemId !== undefined;
    const endpoint = getEndpoints(modal.page, itemId);
    const method = isEditing ? "PATCH" : "POST";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;
      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(formattedPayload),
      });

      if (response.ok) {
        setModal(null);
        await loadAllData(token);
      } else {
        const errData = await getApiErrorMessage(response);
        setErrorModal(errData);
        setModal(null);
      }
    } catch {
      setErrorModal("Network error: Could not reach Django server.");
    }
  }

  async function instantSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawValues = Object.fromEntries(form.entries());

    const formattedPayload: Record<string, any> = {};
    Object.entries(rawValues).forEach(([key, val]) => {
      if (["room_no"].includes(key) && val !== "") {
        formattedPayload[key] = isNaN(Number(val)) ? val : Number(val);
      } else {
        formattedPayload[key] = val;
      }
    });

    if (formattedPayload.email === "") formattedPayload.email = "natura@walkin";

    if (quickBookGuestMode === 'existing') {
      formattedPayload['guest_id'] = quickBookSelectedGuestId;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;
      const response = await fetch("/api/reservation/create-with-guest/", {
        method: "POST",
        headers,
        body: JSON.stringify(formattedPayload),
      });

      if (response.ok) {
        setErrorModal(null);
        setQuickBookOpen(false);
        await loadAllData(token);
      } else {
        const errData = await getApiErrorMessage(response);
        setErrorModal(errData);
      }
    } catch {
      setErrorModal("Network error: Could not reach Django server.");
    }
  }
  
  async function remove(item: RecordItem) {
    if (!window.confirm("Delete this record? This action cannot be undone.")) return;

    const itemId = getItemId(item);
    if (itemId === undefined) {
      setErrorModal("Error: Record has no valid ID/primary key.");
      return;
    }

    const endpoint = getEndpoints(page, itemId);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Token ${token}`;
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
      });
      if (response.ok || response.status === 204) {
        await loadAllData(token);
      } else {
        const errData = await getApiErrorMessage(response);
        setErrorModal(errData);
      }
    } catch {
      setErrorModal("Network error: Could not complete deletion.");
    }
  }

  async function checkIn(reservation: RecordItem) {
    const reservationId = getItemId(reservation);
    if (reservationId === undefined) return;

    setCheckingInId(reservationId);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;
      const response = await fetch(`/api/reservation/${reservationId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "Checked In" }),
      });

      if (response.ok) {
        setReservations((prev) =>
          prev.map((r) => (getItemId(r) === reservationId ? { ...r, status: "Checked In" } : r))
        );
        await loadAllData(token);
      } else {
        const errData = await getApiErrorMessage(response);
        setErrorModal(errData);
      }
    } catch {
      setErrorModal("Network error: Could not complete check-in.");
    } finally {
      setCheckingInId(null);
    }
  }

  const dataMap: Record<Page, RecordItem[]> = {
    Dashboard: [],
    Guests: guests,
    Rooms: rooms,
    "Room Types": roomTypes,
    Reservations: reservations,
  };

  const labels: Record<Page, { title: string; subtitle: string }> = {
    Dashboard: { title: "Good morning, Staff", subtitle: "" },
    Guests: { title: "Guests", subtitle: "Manage guest contact information." },
    Rooms: { title: "Rooms", subtitle: "View and manage every room in your property." },
    "Room Types": { title: "Room Types", subtitle: "Set capacity and nightly rates for each room category." },
    Reservations: { title: "Reservations", subtitle: "Manage current and upcoming guest stays." },
  };

  const filtered = (dataMap[page] || []).filter((item) =>
    Object.values(item).some((v) => String(v).toLowerCase().includes(query.toLowerCase()))
  );

  const nav = ["Dashboard", "Guests", "Rooms", "Room Types", "Reservations"] as Page[];
  const available = rooms.filter((r) => r.status === "Available").length;
  const reserved = rooms.filter((r) => r.status === "Reserved").length;
  const occupied = rooms.filter((r) => r.status === "Occupied").length;
  const totalRooms = rooms.length;
  const occupancyPct = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;

  const arrivalsToday = reservations.filter((r) => r.check_in === todayStr && r.status === "Confirmed").length;

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            login(String(fd.get("username") || ""), String(fd.get("password") || ""));
          }}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 className="mb-6 text-center text-2xl font-bold">Hotel Management</h1>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
          <input name="username" required className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
          <input name="password" type="password" required className="mb-6 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Sign in</button>
          <p className="mt-4 text-center text-xs text-slate-500">Use the provided credentials.</p>
        </form>
        {errorModal && <ErrorModal message={errorModal} onClose={() => setErrorModal(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${sidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-lg font-bold text-white">N</div>
          <div><div className="font-bold tracking-tight">Natura Resort</div><div className="text-xs text-slate-500">Management System</div></div>
        </div>
        <nav className="space-y-1 p-4" aria-label="Main navigation">
          {nav.map((item) => (
            <button key={item} onClick={() => { setPage(item); setQuery(""); setSidebar(false); }}            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${page === item ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon name={item} />{item}
            </button>
          ))}
          <button onClick={logout} className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
            <Icon name="logout" />Sign out
          </button>
        </nav>
      </aside>

      <main className="lg:pl-64">
        {/* Header with Date and Time */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 lg:hidden" onClick={() => setSidebar(true)} aria-label="Open menu"><Icon name="menu"/></button>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{formattedDate}</div>
              <div className="text-xs text-slate-500">{formattedTime}</div>
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{labels[page].title}</h1>{page !== "Dashboard" && <p className="mt-1 text-sm text-slate-500">{labels[page].subtitle}</p>}</div>
            <div className="flex items-center gap-3">
              {page === "Dashboard" && (
                <button onClick={() => setQuickBookOpen(true)}          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                  <Icon name="plus" className="h-4 w-4"/>Quick Book
                </button>
              )}
              {page !== "Dashboard" && (
                <button onClick={() => setModal({ page })}          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                  <Icon name="plus" className="h-4 w-4"/>Add {page === "Room Types" ? "room type" : page.slice(0, -1).toLowerCase()}
                </button>
              )}
            </div>
          </div>

          {page === "Dashboard" ? (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total rooms", totalRooms, "Across all floors", "bg-emerald-50 text-emerald-600", "Rooms"],
                  ["Available now", available, "Ready for guests", "bg-emerald-50 text-emerald-600", "Rooms"],
                  ["Reserved", reserved, "Awaiting check-in", "bg-emerald-50 text-emerald-600", "Rooms"],
                  ["Occupied", occupied, `${occupancyPct}% occupancy`, "bg-red-50 text-red-600", "Guests"],
                ].map(([label, value, sub, color, icon]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
                      <div className={`rounded-lg p-2.5 ${color}`}><Icon name={String(icon)}/></div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{sub}</p>
                  </div>
                ))}
              </section>

              {/* Live Room Tiles */}
              <section className="mt-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Rooms</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {rooms.map((room) => {
                    const statusColors: Record<string, string> = {
                      Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
                      Reserved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
                      Occupied: "bg-red-50 text-red-700 ring-red-600/20",
                      Maintenance: "bg-amber-50 text-amber-700 ring-amber-600/20",
                    };
                    const colorClass = statusColors[room.status] || "bg-slate-100 text-slate-700 ring-slate-300";
                    return (
                      <div key={room.id} className={`rounded-xl border p-3 shadow-sm ring-1 ${colorClass}`}>
                        <div className="text-sm font-bold">{room.room_no}</div>
                        <div className="text-xs opacity-80">{room.room_type_name || "—"}</div>
                        <div className="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset">
                          {room.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Today's Arrivals */}
              {(() => {
                const arrivals = reservations.filter((r) => r.check_in === todayStr && r.status === "Confirmed");
                if (arrivals.length === 0) return null;
                return (
                  <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today's Arrivals</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {arrivals.map((res) => {
                        const guest = guests.find((g) => getItemId(g) === res.guest);
                        const room = rooms.find((r) => getItemId(r) === res.room);
                        const guestName = guest ? `${guest.fname || ""} ${guest.lname || ""}`.trim() : `Guest #${res.guest}`;
                        const roomLabel = room ? `Room ${room.room_no}` : `Room #${res.room}`;
                        return (
                          <div key={res.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                                {guestName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{guestName}</div>
                                <div className="text-xs text-slate-500">{roomLabel} · {res.check_out && `${res.check_out} check-out`}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => checkIn(res)}
                              disabled={checkingInId === res.id}
                              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
                            >
                              {checkingInId === res.id ? "Checking in..." : "Check In"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}
            </>
          ) : (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${page.toLowerCase()}...`}                className="w-full max-w-sm rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-emerald-500"/>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {fields[page].map((field) => <th key={field.key} className="whitespace-nowrap px-3 py-2.5 font-semibold sm:px-5 sm:py-3">{field.label}</th>)}
                      <th className="px-3 py-2.5 text-right font-semibold sm:px-5 sm:py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <tr key={getItemId(item) ?? JSON.stringify(item)} className="hover:bg-slate-50/70">
                        {fields[page].map((field, index) => {
                          let cellValue = item[field.key];
                          if (field.key === "guest") {
                            const foundGuest = guests.find((g) => getItemId(g) === item.guest);
                            cellValue = item.guest_name || (foundGuest ? `${foundGuest.fname || ""} ${foundGuest.lname || ""}`.trim() : item.guest) || cellValue;
                          } else if (field.key === "room") {
                            const foundRoom = rooms.find((r) => getItemId(r) === item.room);
                            cellValue = item.room_number ? `Room ${item.room_number}` : (foundRoom ? `Room ${foundRoom.room_no}` : item.room) || cellValue;
                          } else if (field.key === "room_type" && item.room_type_name) {
                            cellValue = item.room_type_name;
                          }

                          return (
                            <td key={field.key} className={`whitespace-nowrap px-3 py-3 sm:px-5 sm:py-4 ${index === 0 ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                              {field.key === "status" ? <Badge value={String(cellValue ?? "")}/> : String(cellValue ?? "")}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-3 py-3 text-right sm:px-5 sm:py-4">
                          <button onClick={() => setModal({ page, item })} className="rounded-md p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Edit"><Icon name="edit" className="h-4 w-4"/></button>
                          <button onClick={() => remove(item)} className="ml-1 rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Delete"><Icon name="trash" className="h-4 w-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No matching records found.</div>}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
              <h2 className="text-base font-bold sm:text-lg">{modal.item ? "Edit" : "Add"} {modal.page === "Room Types" ? "room type" : modal.page.slice(0, -1).toLowerCase()}</h2>
              <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><Icon name="close"/></button>
            </div>
            <form onSubmit={save}>
              <div className="grid gap-3 p-4 sm:gap-4 sm:p-5 sm:grid-cols-2">
                {fields[modal.page].map((field) => {
                  const currentItem = modal.item;
                  const isRoomStatusEdit = modal.page === "Rooms" && field.key === "status" && currentItem;

                  if (isRoomStatusEdit) {
                    return (
                      <label key={field.key} className={field.key === "email" || field.key === "notes" ? "sm:col-span-2" : ""}>
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">{field.label}</span>
                        <select name={field.key} defaultValue={currentItem?.status === "Maintenance" ? "Maintenance" : "Auto"} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                          <option value="Auto">Auto</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={field.key} className={field.key === "email" || field.key === "notes" ? "sm:col-span-2" : ""}>
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{field.label}</span>
                      {field.options ? (
                        <select name={field.key} defaultValue={String(modal.item?.[field.key] ?? field.options[0]?.value ?? "")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input required={field.key !== "email"} name={field.key} type={field.key === "email" ? "text" : field.type || "text"} defaultValue={String(modal.item?.[field.key] ?? "")} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-3 sm:p-4">
                <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Book Modal */}
      {quickBookOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setQuickBookOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
              <h2 className="text-base font-bold sm:text-lg">Quick Book</h2>
              <button onClick={() => setQuickBookOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><Icon name="close"/></button>
            </div>
            <form onSubmit={instantSave} className="p-4 sm:p-5">
              <div className="mb-3 flex rounded-lg border border-slate-200 p-1 sm:mb-4">
                <button type="button" onClick={() => { setQuickBookGuestMode('new'); setQuickBookSelectedGuestId(''); setQuickBookGuestSearch(''); setQuickBookDropdownOpen(false); }}                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${quickBookGuestMode === 'new' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:text-slate-900'}`}>New Guest</button>
                <button type="button" onClick={() => { setQuickBookGuestMode('existing'); setQuickBookFname(''); setQuickBookLname(''); setQuickBookPhone(''); setQuickBookEmail(''); setQuickBookGuestSearch(''); setQuickBookDropdownOpen(false); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${quickBookGuestMode === 'existing' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:text-slate-900'}`}>Existing Guest</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickBookGuestMode === 'new' ? (
                  <div className="contents min-h-[120px]">
                    <label className="sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">First name</span>
                      <input required name="fname" value={quickBookFname} onChange={(e) => setQuickBookFname(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                    </label>
                    <label className="sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Last name</span>
                      <input required name="lname" value={quickBookLname} onChange={(e) => setQuickBookLname(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                    </label>
                    <label className="sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Phone number</span>
                      <input required name="phone" type="tel" value={quickBookPhone} onChange={(e) => setQuickBookPhone(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                    </label>
                    <label className="sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span>
                      <input name="email" type="text" value={quickBookEmail} onChange={(e) => setQuickBookEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                    </label>
                  </div>
                ) : (
                  <div className="contents min-h-[120px]">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Guest</span>
                      <div ref={quickBookGuestDropdownRef} className="relative">
                        <input
                          autoComplete="off"
                          value={
                            quickBookSelectedGuestId
                              ? (() => {
                                  const g = guests.find((x) => x.id === quickBookSelectedGuestId);
                                  return g ? `${g.fname} ${g.lname} — ${g.phone}` : '';
                                })()
                              : quickBookGuestSearch
                          }
                          onChange={(e) => {
                            setQuickBookGuestSearch(e.target.value.toLowerCase());
                            setQuickBookDropdownOpen(true);
                          }}
                          onFocus={() => setQuickBookDropdownOpen(true)}
                          placeholder="Search or select guest..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                        />
                        {quickBookDropdownOpen && (
                          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                            {(() => {
                              const q = quickBookGuestSearch;
                              const filtered = guests.filter((g) => {
                                if (!q) return true;
                                return `${g.fname} ${g.lname}`.toLowerCase().includes(q) || g.phone.includes(q);
                              });
                              if (filtered.length === 0) {
                                return <div className="px-3 py-2 text-sm text-slate-500">No guests found</div>;
                              }
                              return filtered.map((g) => (
                                <div
                                  key={g.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setQuickBookSelectedGuestId(g.id as number);
                                    setQuickBookGuestSearch(`${g.fname} ${g.lname} — ${g.phone}`);
                                    setQuickBookDropdownOpen(false);
                                  }}
                                  className={`cursor-pointer px-3 py-2 text-sm hover:bg-emerald-50 ${quickBookSelectedGuestId === g.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'}`}
                                >
                                  {g.fname} {g.lname} — {g.phone}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}
                <label className="sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Number of guests</span>
                  <input required name="num_guests" type="number" min="1" value={quickBookGuests} onChange={(e) => setQuickBookGuests(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                  </label>
                  <label className="sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Room number</span>
                  <select required name="room_no" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                    <option value="">Select room</option>
                    {quickBookAvailableRooms.map((r) => (
                      <option key={r.id} value={r.room_no}>Room {r.room_no} ({r.room_type_name || r.room_type})</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Status</span>
                  <select name="status" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Check-in date</span>
                  <input required name="check_in" type="date" value={quickBookCheckIn} onChange={(e) => setQuickBookCheckIn(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                  </label>
                  <label className="sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Check-out date</span>
                  <input required name="check_out" type="date" value={quickBookCheckOut} onChange={(e) => setQuickBookCheckOut(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-3 sm:mt-5">
                <button type="button" onClick={() => setQuickBookOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Book Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {errorModal && <ErrorModal message={errorModal} onClose={() => setErrorModal(null)} />}
    </div>
  );
}

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    Dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    Guests: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    Rooms: <><path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16"/><path d="M8 21v-7h8v7M9 8h.01M15 8h.01"/></>,
    "Room Types": <><path d="M4 19V8M20 19V8M2 19h20M4 14h16"/><path d="M6 8h12a2 2 0 0 1 2 2v4H4v-4a2 2 0 0 1 2-2Z"/></>,
    Reservations: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 16l2 2 5-5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Badge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Reserved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Occupied: "bg-red-50 text-red-700 ring-red-600/20",
    Maintenance: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Maintainance: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Confirmed: "bg-violet-50 text-violet-700 ring-violet-600/20",
    "Checked In": "bg-blue-50 text-blue-700 ring-blue-600/20",
    "Checked Out": "bg-slate-100 text-slate-700 ring-slate-600/20",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[value] || "bg-slate-100 text-slate-700 ring-slate-300"}`}>{value}</span>;
}

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">Error</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-700">{message}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
