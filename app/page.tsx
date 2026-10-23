'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  AlertTriangle,
  Zap,
  Globe,
  UserCheck,
  XCircle,
} from 'lucide-react';

import type {
  ViewKey,
  ExtractionResult,
  DonorMatch,
  BloodGroup,
  RequestStatus,
} from '@/lib/types';
import { BLOOD_GROUPS } from '@/lib/types';

// ── Sidebar Navigation Component ──
function Sidebar({
  view,
  setView,
  menu,
  setMenu,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  menu: boolean;
  setMenu: (v: boolean) => void;
}) {
  const navItems: { key: ViewKey; label: string; Icon: typeof Activity; desc: string }[] = [
    { key: 'command', label: 'Command Center', Icon: Activity, desc: 'Emergency intake & AI analysis' },
    { key: 'register', label: 'Become a Donor', Icon: Users, desc: 'Register as a volunteer' },
    { key: 'dashboard', label: 'Live Dashboard', Icon: Bell, desc: 'Track active requests' },
  ];

  return (
    <aside
      className={`${
        menu ? 'fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm' : 'hidden'
      } lg:block lg:relative lg:w-72 shrink-0 border-r border-border lg:min-h-screen`}
    >
      <div className="p-6 h-full flex flex-col">
        {/* Close button (mobile) */}
        <button
          className="lg:hidden absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-accent/20 shrink-0 border border-border bg-bg-elevated">
            <Image
              src="/logo.png"
              alt="RaktMitra AI Official Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight">
              RaktMitra<span className="text-accent">.</span>
            </div>
            <div className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-medium">
              AI Response Network
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map(({ key, label, Icon, desc }) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                setMenu(false);
              }}
              className={`w-full flex gap-3 items-start text-left px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                view === key
                  ? 'bg-accent-soft border border-accent-border text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <Icon
                size={18}
                className={`mt-0.5 shrink-0 ${
                  view === key ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
                }`}
              />
              <div>
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs text-text-muted mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </nav>

        {/* Bottom card */}
        <div className="mt-auto pt-8">
          <div className="glass p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck size={16} className="text-success shrink-0" />
              Privacy-first coordination
            </div>
            <p className="text-text-muted text-xs mt-2 leading-relaxed">
              Potential donors require blood-bank screening and compatibility confirmation by
              medical professionals.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Status Badge Component ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: 'text-text-muted border-border', label: 'Draft' },
    confirmed: { color: 'text-blue-400 border-blue-500/40', label: 'Confirmed' },
    matching: { color: 'text-warning border-warning/40', label: 'Matching' },
    contacting: { color: 'text-purple-400 border-purple-500/40', label: 'Contacting' },
    in_progress: { color: 'text-accent border-accent-border', label: 'In Progress' },
    fulfilled: { color: 'text-success border-success/40', label: 'Fulfilled' },
    available: { color: 'text-success border-success/40', label: 'Available' },
    unavailable: { color: 'text-text-muted border-border', label: 'Unavailable' },
    contacted: { color: 'text-blue-400 border-blue-500/40', label: 'Contacted' },
    pending: { color: 'text-warning border-warning/40', label: 'Pending' },
    call_me: { color: 'text-purple-400 border-purple-500/40', label: 'Call Me' },
    no_response: { color: 'text-text-muted border-border', label: 'No Response' },
  };
  const { color, label } = config[status] ?? { color: 'text-text-muted border-border', label: status };
  return <span className={`pill ${color}`}>{label}</span>;
}

// ── Stat Card Component ──
function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number | null;
  icon: typeof Activity;
  accent?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? 'text-accent' : 'text-text-muted'} />
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-accent' : ''}`}>
        {value ?? <span className="text-text-muted text-base">—</span>}
      </div>
    </div>
  );
}

// ── Extraction Field Card ──
function FieldCard({ label, value, warning }: { label: string; value: string | number | null; warning?: boolean }) {
  return (
    <div className={`stat-card ${warning && !value ? 'border-warning/40' : ''}`}>
      <div className="text-xs text-text-muted mb-1.5 uppercase tracking-wider">{label}</div>
      <div className={`font-bold text-lg ${!value ? 'text-warning' : ''}`}>
        {value ?? (
          <span className="flex items-center gap-1 text-sm">
            <AlertTriangle size={13} />
            Needs confirmation
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sample Message ──
const SAMPLE_MESSAGE = 'Urgent O negative blood needed at Ruby Hall Pune, 2 units by tonight. Please help!';

// ── Main Application ──
export default function Home() {
  const [view, setView] = useState<ViewKey>('command');
  const [menu, setMenu] = useState(false);

  // Emergency intake state
  const [text, setText] = useState('');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  // Matching state
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ total: number; provisional: boolean } | null>(null);

  // Request state
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('draft');
  const [notifying, setNotifying] = useState<string | null>(null);

  // Registration state
  const [regForm, setRegForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    bloodGroup: '' as string,
    dateOfBirth: '',
    locality: '',
    city: '',
    lastDonationDate: '',
    donationFrequency: 'first_time',
    isAvailable: true,
    screeningDisclosures: [] as string[],
    whatsappOptIn: false,
    privacyConsent: false,
  });
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [regError, setRegError] = useState('');

  // ── Analyze with Gemini ──
  const analyzeMessage = useCallback(async () => {
    if (!text.trim()) {
      setExtractError('Please describe the emergency first.');
      return;
    }

    setExtracting(true);
    setExtractError('');
    setExtraction(null);
    setMatches([]);
    setMatchInfo(null);
    setRequestStatus('draft');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.success) {
        setExtraction(data.data);
        setRequestStatus('draft');
      } else {
        setExtractError(data.error || 'Extraction failed. Please try again.');
      }
    } catch {
      setExtractError('Network error. Check your connection and try again.');
    } finally {
      setExtracting(false);
    }
  }, [text]);

  // ── Confirm & Find Donors ──
  const confirmAndMatch = useCallback(async () => {
    if (!extraction?.bloodGroup) {
      setExtractError('Blood group must be confirmed before matching.');
      return;
    }

    setMatching(true);
    setRequestStatus('matching');

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: extraction.bloodGroup,
          component: extraction.component,
          hospitalLat: 18.5308, // Pune default — would come from geocoding
          hospitalLng: 73.8475,
          searchRadiusKm: 50,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMatches(data.data.matches);
        setMatchInfo({
          total: data.data.totalDonorsSearched,
          provisional: data.data.isProvisional,
        });
        setRequestStatus(data.data.matches.length > 0 ? 'contacting' : 'matching');
      } else {
        setExtractError(data.error || 'Matching failed.');
        setRequestStatus('confirmed');
      }
    } catch {
      setExtractError('Could not reach matching service.');
      setRequestStatus('confirmed');
    } finally {
      setMatching(false);
    }
  }, [extraction]);

  // ── Send WhatsApp notification ──
  const notifyDonor = useCallback(
    async (match: DonorMatch) => {
      if (match.whatsappSent) return;
      setNotifying(match.donorId);

      try {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: `req_${Date.now()}`,
            donorId: match.donorId,
            donorPhone: '+919999999999', // Would come from actual donor data
            donorName: match.donorName,
            bloodGroup: extraction?.bloodGroup,
            hospital: extraction?.hospital || 'Hospital',
            urgency: extraction?.urgency || 'urgent',
          }),
        });

        const data = await res.json();

        if (data.success) {
          setMatches((prev) =>
            prev.map((m) =>
              m.donorId === match.donorId
                ? { ...m, whatsappSent: true, whatsappSentAt: new Date().toISOString(), status: 'contacted' as const }
                : m
            )
          );
        }
      } catch {
        // Silent fail — notification attempt is logged server-side
      } finally {
        setNotifying(null);
      }
    },
    [extraction]
  );

  // ── Register donor ──
  const registerDonor = useCallback(async () => {
    setRegistering(true);
    setRegError('');

    try {
      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          // Location permission denied — continue without
        }
      }

      const res = await fetch('/api/donors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regForm, location }),
      });

      const data = await res.json();

      if (data.success) {
        setRegistered(true);
      } else {
        setRegError(data.error || 'Registration failed.');
      }
    } catch {
      setRegError('Network error. Please try again.');
    } finally {
      setRegistering(false);
    }
  }, [regForm]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <Sidebar view={view} setView={setView} menu={menu} setMenu={setMenu} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-5 lg:px-8 py-4 border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle menu"
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-bg-elevated transition-colors"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden w-7 h-7 rounded-lg overflow-hidden border border-border shrink-0 shadow-sm">
              <Image
                src="/logo.png"
                alt="RaktMitra Logo"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm">
              <span className="text-text-muted">RaktMitra / </span>
              <span className="text-text-primary font-medium">
                {view === 'command' ? 'Command Center' : view === 'register' ? 'Donor Registration' : 'Live Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill flex items-center gap-2">
              <span className="status-pending" />
              <span className="hidden sm:inline">Prototype</span>
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8">
            {/* ─────────────────────────────────── */}
            {/* COMMAND CENTER VIEW                 */}
            {/* ─────────────────────────────────── */}
            {view === 'command' && (
              <div className="animate-fade-in">
                {/* Hero */}
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="pill text-accent border-accent-border font-semibold">
                      <Sparkles size={12} className="text-accent" />
                      GEMINI-POWERED INTAKE
                    </span>
                    <span className="text-text-muted text-xs">From uncertainty to coordinated action</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-3xl">
                    When every second{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-red-400">
                      matters.
                    </span>
                  </h1>
                  <p className="text-text-secondary mt-4 max-w-2xl text-lg leading-relaxed">
                    Describe a blood emergency in your own words. RaktMitra uses AI to structure the request and
                    coordinate nearby volunteers through WhatsApp.
                  </p>
                </div>

                {/* Emergency Input + Extraction Grid */}
                <div className="grid xl:grid-cols-5 gap-5">
                  {/* Input Panel */}
                  <section className="glass p-6 xl:col-span-3">
                    <div className="flex items-center gap-2 font-bold text-lg mb-1">
                      <Sparkles className="text-accent" size={20} />
                      Describe your emergency
                    </div>
                    <p className="text-text-muted text-sm mb-5">
                      English, Hindi or Hinglish. Include the hospital, blood group and required units if known.
                    </p>

                    <label className="sr-only" htmlFor="emergency-input">
                      Emergency description
                    </label>
                    <textarea
                      id="emergency-input"
                      className="field-textarea min-h-[160px]"
                      placeholder="e.g. Urgent O negative blood needed at Ruby Hall Pune, 2 units by tonight..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={2000}
                    />

                    <div className="flex items-center justify-between mt-2 mb-4">
                      <span className="text-xs text-text-muted">{text.length}/2000</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className="btn btn-primary"
                        onClick={analyzeMessage}
                        disabled={extracting || !text.trim()}
                      >
                        {extracting ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={17} />
                            Analyze with Gemini
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setText(SAMPLE_MESSAGE);
                          setExtraction(null);
                          setMatches([]);
                          setMatchInfo(null);
                          setExtractError('');
                        }}
                      >
                        Load demo message
                      </button>
                    </div>

                    {extractError && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-warning" role="alert">
                        <AlertTriangle size={15} />
                        {extractError}
                      </div>
                    )}

                    {!extractError && !extracting && !extraction && (
                      <p className="text-text-muted text-xs mt-4">
                        No messages or donor alerts will be sent from this interface without your explicit confirmation.
                      </p>
                    )}
                  </section>

                  {/* Extraction Panel */}
                  <section className="glass p-6 xl:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-bold text-lg">
                        <Zap size={20} className="text-accent" />
                        Structured extraction
                      </div>
                      {extraction && <StatusBadge status={requestStatus} />}
                    </div>
                    <p className="text-text-muted text-sm mb-5">
                      Review extracted information before starting outreach.
                    </p>

                    {extracting ? (
                      <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="shimmer h-16" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <FieldCard label="Blood Group" value={extraction?.bloodGroup ?? null} warning />
                        <FieldCard label="Units" value={extraction?.units ?? null} warning />
                        <FieldCard label="Hospital" value={extraction?.hospital ?? null} warning />
                        <FieldCard label="City" value={extraction?.city ?? null} />
                        <FieldCard label="Urgency" value={extraction?.urgency ?? null} />
                        <FieldCard label="Component" value={extraction?.component ?? null} warning />
                      </div>
                    )}

                    {extraction?.missingFields && extraction.missingFields.length > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-warning-soft border border-warning/20">
                        <div className="flex items-center gap-2 text-warning text-xs font-semibold mb-1">
                          <AlertTriangle size={13} />
                          Missing information
                        </div>
                        <p className="text-text-secondary text-xs">
                          {extraction.missingFields.join(', ')}
                        </p>
                      </div>
                    )}

                    {extraction?.rawSummary && (
                      <div className="mt-4 p-3 rounded-xl bg-bg-input border border-border">
                        <div className="text-xs text-text-muted mb-1">AI Summary</div>
                        <p className="text-sm text-text-secondary">{extraction.rawSummary}</p>
                      </div>
                    )}

                    {extraction?.confidence !== undefined && extraction.confidence !== null && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-xs text-text-muted">Confidence</div>
                        <div className="flex-1 bg-bg-input rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-accent to-red-400 rounded-full h-1.5 transition-all duration-500"
                            style={{ width: `${extraction.confidence * 100}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono text-text-secondary">
                          {Math.round(extraction.confidence * 100)}%
                        </div>
                      </div>
                    )}

                    {extraction && extraction.bloodGroup && (
                      <button
                        className="btn btn-primary w-full mt-5"
                        onClick={confirmAndMatch}
                        disabled={matching}
                      >
                        {matching ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Searching donors...
                          </>
                        ) : (
                          <>
                            <Search size={17} />
                            Confirm & Find Donors
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    )}
                  </section>
                </div>

                {/* Matching Results */}
                {(matches.length > 0 || matching) && (
                  <section className="glass p-6 mt-5 animate-slide-up">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-lg">
                          <Users size={20} className="text-accent" />
                          Potential Donor Matches
                        </div>
                        {matchInfo && (
                          <p className="text-text-muted text-sm mt-1">
                            {matches.length} potential match{matches.length !== 1 ? 'es' : ''} from{' '}
                            {matchInfo.total} registered donors
                            {matchInfo.provisional && (
                              <span className="text-warning ml-2">(provisional — component unspecified)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {matching ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="shimmer h-20" />
                        ))}
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="text-center py-10">
                        <Search size={40} className="mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary">No matching donors found in the search radius.</p>
                        <p className="text-text-muted text-sm mt-2">Try expanding the search area or contact your local blood bank directly.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches.map((match, i) => (
                          <div
                            key={match.donorId}
                            className="flex items-center justify-between p-4 rounded-2xl bg-bg-input border border-border hover:border-border-hover transition-all duration-200"
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center text-accent font-bold text-sm">
                                {match.bloodGroup}
                              </div>
                              <div>
                                <div className="font-semibold">{match.donorName}</div>
                                <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} />
                                    {match.distanceKm} km away
                                  </span>
                                  <StatusBadge status={match.status} />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {match.whatsappSent ? (
                                <span className="pill text-success border-success/40">
                                  <CheckCircle2 size={13} />
                                  Sent
                                </span>
                              ) : (
                                <button
                                  className="btn btn-success text-xs px-3 py-2"
                                  onClick={() => notifyDonor(match)}
                                  disabled={notifying === match.donorId}
                                >
                                  {notifying === match.donorId ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <>
                                      <MessageCircle size={14} />
                                      WhatsApp
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-5">
                  {[
                    {
                      Icon: MapPin,
                      title: 'Find nearby volunteers',
                      desc: 'Geographic matching using Haversine formula with configurable search radius.',
                      status: 'Active',
                    },
                    {
                      Icon: MessageCircle,
                      title: 'Request availability',
                      desc: 'WhatsApp notifications to opted-in volunteers via Meta Cloud API.',
                      status: 'Active',
                    },
                    {
                      Icon: CheckCircle2,
                      title: 'Coordinate responses',
                      desc: 'Track volunteer replies with webhook-verified status updates.',
                      status: 'Active',
                    },
                  ].map(({ Icon, title, desc, status }) => (
                    <div key={title} className="glass p-5 group hover:border-border-hover transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <Icon className="text-accent" size={22} />
                        <span className="pill text-success border-success/40 text-[10px]">{status}</span>
                      </div>
                      <h2 className="font-bold">{title}</h2>
                      <p className="text-text-muted text-sm mt-2 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Safety Disclaimer */}
                <div className="glass p-5 mt-5 flex items-start gap-3">
                  <ShieldCheck className="text-success shrink-0 mt-0.5" size={18} />
                  <p className="text-text-muted text-sm leading-relaxed">
                    RaktMitra coordinates potential volunteers, not confirmed blood inventory. Blood group compatibility,
                    donor eligibility, and actual donation require confirmation by an authorized blood bank and medical
                    professionals.
                  </p>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────── */}
            {/* DONOR REGISTRATION VIEW             */}
            {/* ─────────────────────────────────── */}
            {view === 'register' && (
              <div className="animate-fade-in">
                <span className="pill text-accent border-accent-border font-semibold">
                  <Users size={12} />
                  VOLUNTEER NETWORK
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold mt-5 tracking-tight">
                  Be someone&apos;s reason to hope.
                </h1>
                <p className="text-text-secondary mt-3 mb-8 max-w-xl leading-relaxed">
                  Register your willingness to donate blood. Your information stays private and you will only be
                  contacted for emergencies matching your blood group and location.
                </p>

                {registered ? (
                  <div className="glass p-8 max-w-2xl text-center animate-slide-up">
                    <div className="w-16 h-16 rounded-2xl bg-success-soft flex items-center justify-center mx-auto mb-5">
                      <CheckCircle2 size={32} className="text-success" />
                    </div>
                    <h2 className="text-2xl font-bold">Registration Complete</h2>
                    <p className="text-text-secondary mt-3 max-w-md mx-auto">
                      Thank you for registering as a potential donor. You will be contacted via WhatsApp only when there
                      is an emergency matching your blood group in your area.
                    </p>
                    <button className="btn btn-secondary mt-6" onClick={() => setView('command')}>
                      Return to Command Center
                    </button>
                  </div>
                ) : (
                  <form
                    className="glass p-6 max-w-3xl"
                    onSubmit={(e) => {
                      e.preventDefault();
                      registerDonor();
                    }}
                  >
                    {/* Personal Information */}
                    <div className="flex items-center gap-2 font-semibold text-text-secondary mb-4">
                      <UserCheck size={16} />
                      Personal Information
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5 mb-8">
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Full name <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="text"
                          placeholder="Your full name"
                          required
                          value={regForm.fullName}
                          onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Phone number <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="tel"
                          placeholder="+91 98765 43210"
                          required
                          value={regForm.phone}
                          onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Email address <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="email"
                          placeholder="you@example.com"
                          required
                          value={regForm.email}
                          onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Date of birth <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="date"
                          required
                          value={regForm.dateOfBirth}
                          onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                        />
                      </label>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 font-semibold text-text-secondary mb-4">
                      <Globe size={16} />
                      Location
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5 mb-8">
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Locality / Area <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="text"
                          placeholder="e.g. Shivajinagar"
                          required
                          value={regForm.locality}
                          onChange={(e) => setRegForm({ ...regForm, locality: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          City <span className="text-accent">*</span>
                        </span>
                        <input
                          className="field mt-2"
                          type="text"
                          placeholder="e.g. Pune"
                          required
                          value={regForm.city}
                          onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        />
                      </label>
                    </div>

                    {/* Donation Info */}
                    <div className="flex items-center gap-2 font-semibold text-text-secondary mb-4">
                      <Heart size={16} />
                      Donation Information
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5 mb-8">
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Blood group <span className="text-accent">*</span>
                        </span>
                        <select
                          className="field mt-2"
                          required
                          value={regForm.bloodGroup}
                          onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                        >
                          <option value="" disabled>
                            Select blood group
                          </option>
                          {BLOOD_GROUPS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">Last donation date</span>
                        <input
                          className="field mt-2"
                          type="date"
                          value={regForm.lastDonationDate}
                          onChange={(e) => setRegForm({ ...regForm, lastDonationDate: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">Donation frequency</span>
                        <select
                          className="field mt-2"
                          value={regForm.donationFrequency}
                          onChange={(e) =>
                            setRegForm({ ...regForm, donationFrequency: e.target.value })
                          }
                        >
                          <option value="first_time">First time</option>
                          <option value="occasional">Occasionally</option>
                          <option value="regular">Regularly</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">Current availability</span>
                        <select
                          className="field mt-2"
                          value={regForm.isAvailable ? 'available' : 'unavailable'}
                          onChange={(e) =>
                            setRegForm({ ...regForm, isAvailable: e.target.value === 'available' })
                          }
                        >
                          <option value="available">Available to be contacted</option>
                          <option value="unavailable">Not currently available</option>
                        </select>
                      </label>
                    </div>

                    {/* Screening */}
                    <div className="flex items-center gap-2 font-semibold text-text-secondary mb-4">
                      <ShieldCheck size={16} />
                      Health Screening Disclosures
                    </div>
                    <p className="text-text-muted text-sm mb-3 leading-relaxed">
                      Select any conditions that may affect your eligibility. This information is stored separately with
                      restricted access and is used only for preliminary screening. Final eligibility is determined by
                      medical professionals at the blood bank.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 mb-8">
                      {[
                        'Recent surgery or transfusion (last 12 months)',
                        'Currently on medication',
                        'Pregnant or nursing',
                        'Chronic illness (diabetes, hypertension, etc.)',
                        'Recent tattoo or piercing (last 6 months)',
                        'Recent travel to malaria-endemic area',
                      ].map((item) => (
                        <label
                          key={item}
                          className="flex items-start gap-3 p-3 rounded-xl bg-bg-input border border-border hover:border-border-hover transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-accent"
                            checked={regForm.screeningDisclosures.includes(item)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...regForm.screeningDisclosures, item]
                                : regForm.screeningDisclosures.filter((d) => d !== item);
                              setRegForm({ ...regForm, screeningDisclosures: updated });
                            }}
                          />
                          <span className="text-sm text-text-secondary">{item}</span>
                        </label>
                      ))}
                    </div>

                    {/* Consent */}
                    <div className="space-y-3 mb-6">
                      <label className="flex items-start gap-3 p-4 rounded-xl bg-bg-input border border-border cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-accent"
                          required
                          checked={regForm.whatsappOptIn}
                          onChange={(e) => setRegForm({ ...regForm, whatsappOptIn: e.target.checked })}
                        />
                        <span className="text-sm text-text-secondary leading-relaxed">
                          <strong className="text-text-primary">WhatsApp opt-in:</strong> I consent to receiving
                          emergency blood donation requests via WhatsApp. I understand I can opt out at any time.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 p-4 rounded-xl bg-bg-input border border-border cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-accent"
                          required
                          checked={regForm.privacyConsent}
                          onChange={(e) =>
                            setRegForm({ ...regForm, privacyConsent: e.target.checked })
                          }
                        />
                        <span className="text-sm text-text-secondary leading-relaxed">
                          <strong className="text-text-primary">Privacy consent:</strong> I agree that my information
                          will be stored securely and used only for emergency coordination. My medical disclosures will
                          be stored separately with restricted access.
                        </span>
                      </label>
                    </div>

                    {regError && (
                      <div className="flex items-center gap-2 mb-4 text-sm text-warning" role="alert">
                        <AlertTriangle size={15} />
                        {regError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!regForm.whatsappOptIn || !regForm.privacyConsent || registering}
                      className="btn btn-primary"
                    >
                      {registering ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          Register as Donor
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ─────────────────────────────────── */}
            {/* LIVE DASHBOARD VIEW                 */}
            {/* ─────────────────────────────────── */}
            {view === 'dashboard' && (
              <div className="animate-fade-in">
                <span className="pill text-accent border-accent-border font-semibold">
                  <Activity size={12} />
                  COORDINATION DASHBOARD
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold mt-5 tracking-tight">Live Requests</h1>
                <p className="text-text-secondary mt-3 mb-8 max-w-xl">
                  Track emergency requests, volunteer responses, and coordination status in real time.
                </p>

                {/* Dashboard stats from current session */}
                {extraction ? (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard
                        label="Blood Group"
                        value={extraction.bloodGroup}
                        icon={Heart}
                        accent
                      />
                      <StatCard label="Units" value={extraction.units} icon={Zap} />
                      <StatCard label="Matches" value={matches.length} icon={Users} />
                      <StatCard
                        label="Contacted"
                        value={matches.filter((m) => m.whatsappSent).length}
                        icon={Send}
                      />
                    </div>

                    {/* Request Details Card */}
                    <div className="glass p-6 mb-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 font-bold">
                          <Activity size={18} className="text-accent" />
                          Active Emergency Request
                        </div>
                        <StatusBadge status={requestStatus} />
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Hospital</div>
                          <div className="font-medium">{extraction.hospital || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">City</div>
                          <div className="font-medium">{extraction.city || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Urgency</div>
                          <div className="font-medium capitalize">{extraction.urgency || 'Not specified'}</div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-bg-input border border-border">
                        <div className="text-xs text-text-muted mb-1">Original message</div>
                        <p className="text-sm text-text-secondary italic">&ldquo;{text}&rdquo;</p>
                      </div>
                    </div>

                    {/* Volunteer Response Tracking */}
                    {matches.length > 0 && (
                      <div className="glass p-6">
                        <div className="flex items-center gap-2 font-bold mb-4">
                          <Users size={18} className="text-accent" />
                          Volunteer Response Tracking
                        </div>

                        {/* Response Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                          <div className="stat-card text-center">
                            <div className="text-2xl font-bold text-text-primary">{matches.length}</div>
                            <div className="text-xs text-text-muted mt-1">Total Matches</div>
                          </div>
                          <div className="stat-card text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {matches.filter((m) => m.whatsappSent).length}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Contacted</div>
                          </div>
                          <div className="stat-card text-center">
                            <div className="text-2xl font-bold text-warning">
                              {matches.filter((m) => m.status === 'pending' || m.status === 'contacted').length}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Awaiting</div>
                          </div>
                          <div className="stat-card text-center">
                            <div className="text-2xl font-bold text-success">
                              {matches.filter((m) => m.status === 'available').length}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Available</div>
                          </div>
                          <div className="stat-card text-center">
                            <div className="text-2xl font-bold text-text-muted">
                              {matches.filter((m) => m.status === 'unavailable').length}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Declined</div>
                          </div>
                        </div>

                        {/* Individual donors */}
                        <div className="space-y-2">
                          {matches.map((match) => (
                            <div
                              key={match.donorId}
                              className="flex items-center justify-between p-3 rounded-xl bg-bg-input border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent font-bold text-xs">
                                  {match.bloodGroup}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{match.donorName}</div>
                                  <div className="text-xs text-text-muted flex items-center gap-2">
                                    <MapPin size={10} />
                                    {match.distanceKm} km
                                    {match.whatsappSentAt && (
                                      <span className="text-text-muted">
                                        · Sent {new Date(match.whatsappSentAt).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={match.status} />
                                {match.status === 'available' && (
                                  <button className="btn btn-ghost p-2" title="Call donor">
                                    <Phone size={14} className="text-success" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass p-12 text-center">
                    <Clock3 size={48} className="mx-auto text-text-muted mb-5" />
                    <h2 className="text-xl font-bold">No active requests</h2>
                    <p className="text-text-muted text-sm mt-3 max-w-md mx-auto">
                      Submit an emergency from the Command Center to see live coordination data here. This screen
                      intentionally shows no fabricated data.
                    </p>
                    <button className="btn btn-secondary mt-6" onClick={() => setView('command')}>
                      <Activity size={16} />
                      Go to Command Center
                    </button>
                  </div>
                )}

                {/* Safety Disclaimer */}
                <div className="glass p-4 mt-5 flex items-start gap-3">
                  <ShieldCheck className="text-success shrink-0 mt-0.5" size={16} />
                  <p className="text-text-muted text-xs leading-relaxed">
                    All matched volunteers require professional blood bank screening before donation. Contact information
                    is only accessible to authorized coordinators.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-5 lg:px-8 py-5 mt-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded overflow-hidden shrink-0">
                <Image
                  src="/logo.png"
                  alt="RaktMitra Logo"
                  width={16}
                  height={16}
                  className="w-full h-full object-cover"
                />
              </div>
              <span>RaktMitra AI · Emergency coordination platform</span>
            </div>
            <div>Not a substitute for emergency medical services · Always call 108 for emergencies</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
