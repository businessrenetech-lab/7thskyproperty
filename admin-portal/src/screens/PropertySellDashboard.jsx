import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Building2, CalendarClock, CheckCircle2, Clock3,
  FileSearch, HandCoins, Plus, Scale, Search, Users, WalletCards, ArrowRight,
  TrendingUp, Phone, Mail, FileText, CheckCircle, ExternalLink, Filter,
  RefreshCw, Sparkles, ChevronRight, ShieldCheck, ArrowUpRight, BarChart3,
  CalendarDays, FileSignature, Landmark
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  Button, EmptyState, StatusBadge, Badge
} from "../ui/kit";
import {
  propertyFilePath, propertyWizardPath, settlementDeskPath, salesPropertiesPath, clientProfilePath
} from "./sales/paths";

const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload ?? {};
const listFrom = (payload) => {
  const body = unwrap(payload);
  if (Array.isArray(body)) return body;
  const list = body.properties || body.listings || body.sales || body.rows || body.items || [];
  return Array.isArray(list) ? list : list.rows || list.items || list.data || [];
};
const num = (value) => Number(value || 0);
const bdt = (value) => `৳${num(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const metric = (metrics, ...keys) => keys.reduce((value, key) => value ?? metrics?.[key], undefined) ?? 0;

// High-Density Executive Stat KPI Card
const CompactKpi = ({ icon: Icon, label, value, tone = "blue", sub, onClick }) => {
  const tones = {
    blue: { bg: "#f0f9ff", border: "#bae6fd", iconBg: "#0284c7", text: "#0369a1" },
    green: { bg: "#f0fdf4", border: "#bbf7d0", iconBg: "#16a34a", text: "#15803d" },
    amber: { bg: "#fffbeb", border: "#fde68a", iconBg: "#d97706", text: "#b45309" },
    sky: { bg: "#f8fafc", border: "#e2e8f0", iconBg: "#475569", text: "#334155" },
    red: { bg: "#fef2f2", border: "#fca5a5", iconBg: "#dc2626", text: "#b91c1c" },
  }[tone] || tones.blue;

  return (
    <div
      onClick={onClick}
      style={{
        background: tones.bg,
        border: `1px solid ${tones.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 3px rgba(13,27,47,0.03)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: tones.iconBg, color: "#ffffff",
        display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.08)"
      }}>
        <Icon size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted, #64748b)" }}>
          {label}
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink, #0f172a)", lineHeight: 1.2, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: tones.text, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        )}
      </div>
      {onClick && (
        <ArrowRight size={14} style={{ color: "var(--muted)", opacity: 0.6 }} />
      )}
    </div>
  );
};

export default function PropertySellDashboard({
  category = "residential",
  title = "Residential · Sales Dashboard",
  desc = "Seller service — listings, deal flow, pending actions, and settlement escrow."
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sales/dashboard", { params: { category } });
      const body = unwrap(response);
      setDashboard(body);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load sales dashboard");
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = dashboard.metrics || dashboard.kpis || dashboard.summary || {};
  const counters = dashboard.counters || {};
  const properties = dashboard.properties || [];
  const activity = dashboard.activity || {};

  const values = {
    active_listings: metric(metrics, "active_listings", "listings", "active", "listings_active"),
    offers_awaiting_review: metric(metrics, "offers_awaiting_review", "offers_pending_review", "pending_offers"),
    under_contract: metrics.accepted_under_contract ?? (num(metrics.accepted_offers) + num(metrics.under_contract)),
    client_funds_held: metric(metrics, "client_funds_held", "funds_held"),
    settlements_review: metrics.settlements_needing_review_approval ?? (num(metrics.settlements_needing_review || metrics.settlement_review) + num(metrics.settlements_needing_approval)),
    payout_exceptions: metric(metrics, "payout_exceptions", "exceptions"),
    completed_sales: metric(metrics, "completed_sales", "completed"),
    open_enquiries: metric(metrics, "open_enquiries", "enquiries"),
    upcoming_appointments: metric(metrics, "upcoming_appointments", "appointments"),
  };

  // Funnel & Pipeline Breakdown
  const pipeline = useMemo(() => {
    const totalProps = counters.properties || properties.length || 0;
    const available = counters.available || properties.filter((p) => p.status === "available").length || 0;
    const reserved = counters.reserved || properties.filter((p) => p.status === "reserved").length || 0;
    const underOffer = num(values.under_contract) || properties.filter((p) => p.active_transaction).length || 0;
    const sold = counters.sold || properties.filter((p) => p.status === "sold").length || 0;

    return {
      total: totalProps,
      available,
      reserved,
      underOffer,
      sold
    };
  }, [counters, properties, values.under_contract]);

  const openBuyerClient = (enquiry) => {
    if (enquiry.client_id || enquiry.contact_id) {
      navigate(clientProfilePath(category, { clientId: enquiry.client_id, contactId: enquiry.contact_id }));
    } else {
      toast.error("No linked buyer contact found for this enquiry");
    }
  };

  const hasActionRequired = num(values.offers_awaiting_review) > 0 || num(values.settlements_review) > 0 || num(values.payout_exceptions) > 0;

  return (
    <div className="pm-scope pm-col" style={{ gap: 14 }}>
      {/* Executive Command Header Banner */}
      <div className="card" style={{
        padding: "18px 22px",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--cyan, #0ea5e9)",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(13,27,47,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="pm-eyebrow" style={{ letterSpacing: "0.12em" }}>RESIDENTIAL SALES · OPERATIONS COCKPIT</div>
            <h1 style={{ margin: "4px 0 2px", fontSize: 23, fontWeight: 800, color: "var(--ink)" }}>{title}</h1>
            <div className="pm-meta" style={{ fontSize: 13 }}>{desc}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Building2}
              onClick={() => navigate(salesPropertiesPath(category))}
            >
              View Properties ({counters.properties || properties.length || 0})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Users}
              onClick={() => navigate(`/${category}/enquiry`)}
            >
              Buyer Enquiries ({num(values.open_enquiries)})
            </Button>
            <Button
              size="sm"
              icon={Plus}
              className="btn-primary"
              onClick={() => navigate(propertyWizardPath(category, null, `listing_type=sale&category=${encodeURIComponent(category)}`))}
            >
              New Sale Listing
            </Button>
          </div>
        </div>
      </div>

      {/* 6-Column Executive KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 10 }}>
        <CompactKpi
          icon={Building2}
          label="Active Listings"
          value={num(values.active_listings)}
          sub="Live & available on market"
          tone="blue"
          onClick={() => navigate(`${salesPropertiesPath(category)}?tab=listed`)}
        />
        <CompactKpi
          icon={Clock3}
          label="Pending Offers"
          value={num(values.offers_awaiting_review)}
          sub={num(values.offers_awaiting_review) > 0 ? "Requires review / decision" : "All offers actioned"}
          tone={num(values.offers_awaiting_review) > 0 ? "amber" : "sky"}
          onClick={() => navigate(`/${category}/buy`)}
        />
        <CompactKpi
          icon={CheckCircle2}
          label="Under Contract"
          value={num(values.under_contract)}
          sub="Deals in active settlement"
          tone="green"
          onClick={() => navigate(`${salesPropertiesPath(category)}?tab=under_offer`)}
        />
        <CompactKpi
          icon={WalletCards}
          label="Client Funds Held"
          value={bdt(values.client_funds_held)}
          sub="Held in trust escrow"
          tone="green"
          onClick={() => navigate(`/${category}/accounting`)}
        />
        <CompactKpi
          icon={Scale}
          label="Settlement Reviews"
          value={num(values.settlements_review)}
          sub={num(values.settlements_review) > 0 ? "Approval / finance check needed" : "Settlements up to date"}
          tone={num(values.settlements_review) > 0 ? "amber" : "sky"}
          onClick={() => navigate(`/${category}/settlements`)}
        />
        <CompactKpi
          icon={HandCoins}
          label="Completed Sales"
          value={num(values.completed_sales)}
          sub="Fully closed & settled"
          tone="blue"
          onClick={() => navigate(`${salesPropertiesPath(category)}?tab=settled`)}
        />
      </div>

      {/* Priority Operational Alerts (if pending items exist) */}
      {hasActionRequired && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 12,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(217, 119, 6, 0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#d97706", color: "#fff",
              display: "grid", placeItems: "center", flexShrink: 0
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 750, color: "#92400e" }}>
                Operational Attention Required
              </div>
              <div style={{ fontSize: 12, color: "#b45309", marginTop: 1 }}>
                {[
                  num(values.offers_awaiting_review) > 0 && `${values.offers_awaiting_review} offer(s) awaiting review`,
                  num(values.settlements_review) > 0 && `${values.settlements_review} settlement(s) needing approval`,
                  num(values.payout_exceptions) > 0 && `${values.payout_exceptions} payout exception(s)`
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {num(values.offers_awaiting_review) > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/${category}/buy`)}
                style={{ borderColor: "#fde68a", color: "#92400e", background: "#fef3c7" }}
              >
                Review Offers
              </Button>
            )}
            {num(values.settlements_review) > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/${category}/settlements`)}
                style={{ borderColor: "#fde68a", color: "#92400e", background: "#fef3c7" }}
              >
                Inspect Settlements
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Deal Pipeline & Portfolio Velocity Strip */}
      <div className="card" style={{ padding: "14px 18px", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 750, color: "var(--ink)" }}>
              Sales Pipeline & Deal Velocity
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              Total portfolio across market availability and settlement progression
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={Building2}
            onClick={() => navigate(salesPropertiesPath(category))}
          >
            Open Properties Register <ArrowRight size={13} style={{ marginLeft: 4 }} />
          </Button>
        </div>

        {/* Funnel Stage Metric Blocks */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
          marginBottom: 10
        }}>
          <div style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 8,
            padding: "8px 12px"
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>1. Available</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{pipeline.available}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>On open market</div>
          </div>

          <div style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 8,
            padding: "8px 12px"
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>2. Reserved</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{pipeline.reserved}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Deposit / hold placed</div>
          </div>

          <div style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 8,
            padding: "8px 12px"
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>3. Under Contract</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#d97706", marginTop: 2 }}>{pipeline.underOffer}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>In settlement process</div>
          </div>

          <div style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 8,
            padding: "8px 12px"
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--good, #16a34a)", textTransform: "uppercase" }}>4. Settled / Closed</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--good, #16a34a)", marginTop: 2 }}>{pipeline.sold}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Ownership transferred</div>
          </div>
        </div>

        {/* Visual Segmented Bar */}
        {pipeline.total > 0 && (
          <div style={{
            height: 8,
            borderRadius: 4,
            display: "flex",
            overflow: "hidden",
            background: "var(--surface-3, #e2e8f0)"
          }}>
            <div
              style={{
                width: `${(pipeline.available / pipeline.total) * 100}%`,
                background: "#0284c7"
              }}
              title={`Available: ${pipeline.available}`}
            />
            <div
              style={{
                width: `${(pipeline.reserved / pipeline.total) * 100}%`,
                background: "#38bdf8"
              }}
              title={`Reserved: ${pipeline.reserved}`}
            />
            <div
              style={{
                width: `${(pipeline.underOffer / pipeline.total) * 100}%`,
                background: "#f59e0b"
              }}
              title={`Under Contract: ${pipeline.underOffer}`}
            />
            <div
              style={{
                width: `${(pipeline.sold / pipeline.total) * 100}%`,
                background: "#16a34a"
              }}
              title={`Settled: ${pipeline.sold}`}
            />
          </div>
        )}
      </div>

      {/* Operational 3-Column Operations Hub */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12 }}>
        {/* Current Sales & Transactions */}
        <div className="pm-card" style={{ overflow: "hidden", borderRadius: 12 }}>
          <div className="pm-card-h" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><Scale size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5, fontWeight: 700 }}>Sales in Settlement</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Active transactions in escrow</div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => navigate(`/${category}/settlements`)}
              style={{
                border: "none", background: "none", color: "var(--cyan, #0ea5e9)",
                fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex",
                alignItems: "center", gap: 3
              }}
            >
              Bulk Desk <ArrowRight size={12} />
            </button>
          </div>
          <div className="pm-card-body" style={{ padding: "8px 16px 14px" }}>
            {(activity.current_sales || []).length ? (
              (activity.current_sales || []).slice(0, 5).map((s) => (
                <div
                  key={s.transaction_id}
                  onClick={() => navigate(propertyFilePath(category, s.property_id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--line-soft, #f1f5f9)",
                    cursor: "pointer",
                    gap: 10
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.property_title || "Sale Property"}
                    </div>
                    <div className="cell-sub" style={{ fontSize: 11.5, marginTop: 1 }}>
                      {s.funds_held ? (
                        <span style={{ color: "var(--good, #16a34a)", fontWeight: 650 }}>{bdt(s.funds_held)} held</span>
                      ) : (
                        <span>Escrow pending</span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusBadge status={s.settlement_status || s.status || "under_contract"} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(settlementDeskPath(category, s.property_id));
                      }}
                      title="Open Settlement Desk"
                      style={{
                        background: "none", border: "none", color: "var(--cyan)",
                        cursor: "pointer", padding: 2, display: "grid", placeItems: "center"
                      }}
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "16px 0", fontSize: 12, textAlign: "center" }}>
                No active sales transactions currently settling.
              </div>
            )}
          </div>
        </div>

        {/* Buyer Enquiries Widget */}
        <div className="pm-card" style={{ overflow: "hidden", borderRadius: 12 }}>
          <div className="pm-card-h" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><Users size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5, fontWeight: 700 }}>Recent Buyer Enquiries</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Inbound buyer interest</div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => navigate(`/${category}/enquiry`)}
              style={{
                border: "none", background: "none", color: "var(--cyan, #0ea5e9)",
                fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex",
                alignItems: "center", gap: 3
              }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="pm-card-body" style={{ padding: "8px 16px 14px" }}>
            {(activity.enquiries || []).length ? (
              (activity.enquiries || []).slice(0, 5).map((e) => (
                <div key={e.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: "1px solid var(--line-soft, #f1f5f9)",
                  gap: 10
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => openBuyerClient(e)}
                      style={{
                        background: "none", border: "none", padding: 0, color: "var(--navy, #0f172a)",
                        fontWeight: 750, fontSize: 13, cursor: "pointer", textAlign: "left",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block"
                      }}
                      title="Open Buyer Client Profile"
                    >
                      {e.enquirer_name || "Unnamed Buyer"}
                    </button>
                    <div className="cell-sub" style={{ fontSize: 11.5, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.phone || e.email || "—"} {e.property_title ? `· ${e.property_title}` : ""}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={e.stage || "new"} />
                  </div>
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "16px 0", fontSize: 12, textAlign: "center" }}>
                No recent buyer enquiries recorded.
              </div>
            )}
          </div>
        </div>

        {/* Appointments / Viewings Widget */}
        <div className="pm-card" style={{ overflow: "hidden", borderRadius: 12 }}>
          <div className="pm-card-h" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><CalendarClock size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5, fontWeight: 700 }}>Scheduled Viewings</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Property inspections &amp; meetings</div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => navigate(`/${category}/calendar`)}
              style={{
                border: "none", background: "none", color: "var(--cyan, #0ea5e9)",
                fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex",
                alignItems: "center", gap: 3
              }}
            >
              Calendar <ArrowRight size={12} />
            </button>
          </div>
          <div className="pm-card-body" style={{ padding: "8px 16px 14px" }}>
            {(activity.appointments || []).length ? (
              (activity.appointments || []).slice(0, 5).map((a) => (
                <div key={a.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: "1px solid var(--line-soft, #f1f5f9)",
                  fontSize: 12.5,
                  gap: 10
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.enquirer_name}
                    </div>
                    <div className="cell-sub" style={{ fontSize: 11.5, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.property_title || "Viewing"}
                    </div>
                  </div>
                  <span className="cell-sub" style={{
                    fontSize: 11,
                    fontWeight: 650,
                    flexShrink: 0,
                    background: "var(--surface-3, #f1f5f9)",
                    padding: "3px 7px",
                    borderRadius: 6
                  }}>
                    {new Date(a.when).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "16px 0", fontSize: 12, textAlign: "center" }}>
                No upcoming viewings scheduled.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Strip to Key Modules */}
      <div className="card" style={{
        padding: "14px 18px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              Property Portfolio &amp; Operations Hub
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              Dedicated registers for inventory, buyer mandates, sale agreements, and analytics.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="sm"
              variant="ghost"
              icon={Building2}
              onClick={() => navigate(salesPropertiesPath(category))}
            >
              Properties Register
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={FileSignature}
              onClick={() => navigate(`/${category}/agreements/sale`)}
            >
              Sale Agreements
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={BarChart3}
              onClick={() => navigate(`/${category}/reports`)}
            >
              Analytics Reports
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Landmark}
              onClick={() => navigate(`/${category}/accounting`)}
            >
              Trust Accounting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
