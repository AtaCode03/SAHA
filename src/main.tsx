import {PriceCalculator,PriceSummary} from './Pricing';
import {OrderRoadRoute} from './PlanRoadRoute';
import {Weather} from './Weather';
import {Planning} from './Planning';
import {FieldAddress} from './FieldAddress';
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  setCsrf,
  date,
  number,
  labels,
  localInput,
  iso,
  today,
  dayEnd,
} from "./api";
import { FieldMap } from "./Map";
import {Parcels} from './Parcels';
import "./style.css";
type User = { id: string; name: string; role: "ADMIN" | "OPERATOR" };
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error">
      {message}
    </div>
  ) : null;
}
function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label>
      {label}
      <select {...props}>{children}</select>
    </label>
  );
}
function Text({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label>
      {label}
      <textarea {...props} />
    </label>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, E] = useState(""),
    [password, P] = useState(""),
    [error, X] = useState(""),
    [busy, B] = useState(false);
  return (
    <main className="login">
      <div className="login-story">
        <div className="wordmark">◈ SAHA</div>
        <h1>
          Seydişehir'de
          <br />
          her işin kaydı
          <br />
          yerinde.
        </h1>
        <p>
          Tarımsal drone hizmeti için iş programı,
          <br />
          operasyon ve tahsilat takibi.
        </p>
        <div className="story-foot">
          SEYDİŞEHİR · KONYA
          <br />
          <small>İşletme operasyon paneli</small>
        </div>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          B(true);
          X("");
          try {
            const r = await api("/auth/login", "POST", { email, password });
            setCsrf(r.csrf);
            onLogin(r.user);
          } catch (err) {
            X((err as Error).message);
          } finally {
            B(false);
          }
        }}
      >
        <span className="eyebrow">İŞLETME GİRİŞİ</span>
        <h2>Hoş geldiniz</h2>
        <p className="muted">Size tanımlanan hesapla giriş yapın.</p>
        <Input
          label="E-posta"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => E(e.target.value)}
          required
        />
        <Input
          label="Parola"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => P(e.target.value)}
          required
        />
        <ErrorBox message={error} />
        <button disabled={busy}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap →"}
        </button>
        <p className="hint">
          Hesapları işletme yöneticisi oluşturur. Drone bağlantısı ve çevrimdışı
          kayıt bulunmaz.
        </p>
      </form>
    </main>
  );
}
function useList(path: string, query = "", refresh = 0) {
  const [data, D] = useState<any[]>([]),
    [total, T] = useState(0),
    [error, E] = useState(""),
    [loading, L] = useState(true);
  useEffect(() => {
    let active = true;
    L(true);
    E("");
    api(path + "?" + query)
      .then((r) => {
        if (active) {
          D(r.data);
          T(r.total ?? r.data.length);
        }
      })
      .catch((e) => {
        if (active) E(e.message);
      })
      .finally(() => {
        if (active) L(false);
      });
    return () => {
      active = false;
    };
  }, [path, query, refresh]);
  return { data, total, error, loading };
}
function PageHead({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <span className="eyebrow">SAHA YÖNETİMİ</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
function Empty({
  loading,
  error,
  count,
}: {
  loading: boolean;
  error: string;
  count: number;
}) {
  if (error) return <ErrorBox message={error} />;
  if (loading)
    return (
      <p role="status" className="empty">
        Kayıtlar yükleniyor…
      </p>
    );
  if (!count)
    return (
      <div className="empty">
        Henüz kayıt yok. İlk kaydı ekleyerek başlayın.
      </div>
    );
  return null;
}
function Pager({
  page,
  setPage,
  total,
}: {
  page: number;
  setPage: (p: number) => void;
  total: number;
}) {
  return (
    <div className="pager">
      <span>
        {total} kayıt · Sayfa {page}
      </span>
      <button
        type="button"
        className="secondary"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Önceki
      </button>
      <button
        type="button"
        className="secondary"
        disabled={page * 25 >= total}
        onClick={() => setPage(page + 1)}
      >
        Sonraki
      </button>
    </div>
  );
}
function Customers() {
  const [q, Q] = useState(""),
    [page, P] = useState(1),
    [refresh, R] = useState(0),
    [form, F] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false);
  const list = useList(
    "/customers",
    new URLSearchParams({ q, page: String(page) }).toString(),
    refresh,
  );
  const blank = {
    name: "",
    phone: "",
    neighborhood: "",
    notes: "",
    active: true,
  };
  return (
    <>
      <PageHead
        title="Müşteriler"
        description="Müşteri bilgileri, mahalle ve iletişim kayıtları."
      >
        <button
          onClick={() => {
            F(blank);
            E("");
          }}
        >
          + Müşteri ekle
        </button>
      </PageHead>
      <Input
        label="Müşteri / telefon ara"
        value={q}
        onChange={(e) => {
          Q(e.target.value);
          P(1);
        }}
      />
      {form && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            B(true);
            E("");
            try {
              const { id, ...body } = form;
              await api(
                "/customers" + (id ? "/" + id : ""),
                id ? "PUT" : "POST",
                body,
              );
              F(null);
              R(refresh + 1);
            } catch (err) {
              E((err as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          <h2 className="wide">
            {form.id ? "Müşteriyi düzenle" : "Yeni müşteri"}
          </h2>
          {["name", "phone", "neighborhood"].map((k, i) => (
            <Input
              key={k}
              label={["Ad / unvan", "Telefon", "Mahalle"][i]}
              value={form[k]}
              required
              onChange={(e) => F({ ...form, [k]: e.target.value })}
            />
          ))}
          <Text
            label="Not"
            value={form.notes ?? ""}
            onChange={(e) => F({ ...form, notes: e.target.value })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => F({ ...form, active: e.target.checked })}
            />
            Aktif müşteri
          </label>
          <div className="wide">
            <ErrorBox message={error} />
            <div className="actions">
              <button disabled={busy}>
                {busy ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => F(null)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </form>
      )}
      <Empty {...list} count={list.data.length} />
      <div className="cards">
        {!list.loading &&
          !list.error &&
          list.data.map((c) => (
            <article className="panel" key={c.id}>
              <div className="row">
                <h2>{c.name}</h2>
                <span className="badge">{c.active ? "Aktif" : "Arşiv"}</span>
              </div>
              <p>
                {c.phone} · {c.neighborhood}
              </p>
              {c.source === "SYNTHETIC" && (
                <span className="badge warning">Sentetik veri</span>
              )}
              <p className="muted">{c.notes}</p>
              <button
                className="secondary"
                onClick={() => {
                  F({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    neighborhood: c.neighborhood,
                    notes: c.notes,
                    active: c.active,
                  });
                  E("");
                }}
              >
                Düzenle / arşivle
              </button>
            </article>
          ))}
      </div>
      <Pager page={page} setPage={P} total={list.total} />
    </>
  );
}
function Fields() {
  const [queryBusy,QB]=useState(false),[queryError,QE]=useState("");
  const querySequence=useRef(0);
  const [page, P] = useState(1),
    [refresh, R] = useState(0),
    [form, F] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [boundary, S] = useState("");
  useEffect(()=>{querySequence.current++;QE("");QB(false);},[form?.province,form?.district,form?.neighborhood,form?.block,form?.parcel]);
  const list = useList("/fields", "page=" + page, refresh),
    customers = useList("/customers", "pageSize=100", refresh);
  const blank = {
    customerId: "",
    name: "",
    province: "",
    district: "",
    neighborhood: "",
    block: "",
    parcel: "",
    area: null,
    areaOrigin: null,
    crop: null,
    latitude: null,
    longitude: null,
    boundary: null,
    accessNotes: "",
    active: true,
  };
  return (
    <>
      <PageHead
        title="Tarlalar"
        description="Dekar, konum ve erişim bilgileri. Ada-parsel tek başına konum değildir."
      >
        <button
          onClick={() => {
            F(blank);
            S("");
            E("");
          }}
        >
          + Tarla ekle
        </button>
      </PageHead>
      {form && (
        <form
          className="panel field-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            B(true);
            E("");
            try {
              const { id, ...body } = form;
              body.boundary = boundary ? JSON.parse(boundary) : null;
              await api(
                "/fields" + (id ? "/" + id : ""),
                id ? "PUT" : "POST",
                body,
              );
              F(null);
              R(refresh + 1);
            } catch (err) {
              E((err as Error).message);
            } finally {
              B(false);
            }
          }}
        >
<div className="field-editor-head"><div><h2>{form.id?'Tarlayı düzenle':'Yeni tarla'}</h2><p className="muted">Adres, ada ve parsel bilgilerini seçip parseli haritada görüntüleyin.</p></div></div><div className="form-grid">
          <Select
            label="Müşteri"
            value={form.customerId}
            required
            onChange={(e) => F({ ...form, customerId: e.target.value })}
          >
            <option value="">Seçin</option>
            {customers.data
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          <FieldAddress value={form} onChange={address=>{querySequence.current++;S("");F({...form,...address,boundary:null,latitude:null,longitude:null});}}/>
          {[
            "name",
            "block",
            "parcel",
          ].map((k, i) => (
            <Input
              key={k}
              label={
                [
                  "Tarla adı",
                  "Ada (isteğe bağlı)",
                  "Parsel (isteğe bağlı)",
                ][i]
              }
              value={form[k] ?? ""}
              required={!["block", "parcel"].includes(k)}
              inputMode={k === "area" ? "decimal" : undefined}
              onChange={(e) => {if(k==="block"||k==="parcel"){querySequence.current++;S("");F({...form,[k]:e.target.value,boundary:null,latitude:null,longitude:null});}else F({...form,[k]:e.target.value});}}
            />
          ))}

</div>
<div className="field-parcel-preview"><div className="row"><h3>Parsel haritası</h3><button type="button" disabled={queryBusy||!form.province||!form.district||!form.neighborhood||!form.block||!form.parcel} onClick={async()=>{const sequence=++querySequence.current;QB(true);QE('');try{const r=await api('/parcels/query-address','POST',{province:form.province,district:form.district,neighborhood:form.neighborhood,block:form.block,parcel:form.parcel});if(sequence!==querySequence.current)return;const geometry=r.geometry.features?.[0]?.geometry;if(r.geometry.features?.length!==1||geometry?.type!=='Polygon')throw Error('Sorgu sonucu tek Polygon değil; bu tarla kayıt biçimine aktarılamadı.');F((current:any)=>({...current,boundary:geometry,latitude:null,longitude:null}));S(JSON.stringify(geometry));}catch(e){if(sequence===querySequence.current)QE((e as Error).message);}finally{if(sequence===querySequence.current)QB(false);}}}>{queryBusy?'Parsel sorgulanıyor…':'Parseli Göster'}</button></div>
<p className="hint">Sınır yalnız parsel servisinden alınır. Haritadan elle konum seçilmez veya sınır çizilmez.</p>
{queryError&&<div className="error" role="alert">{queryError}</div>}
<FieldMap boundary={form.boundary}/>
{!form.boundary&&<p className="hint">Henüz parsel sınırı alınmadı. Adres, ada ve parseli tamamlayıp Parseli Göster düğmesine basın.</p>}
</div>
<div className="form-grid"><Text label="Erişim notları" value={form.accessNotes??''} onChange={e=>F({...form,accessNotes:e.target.value})}/><label className="check"><input type="checkbox" checked={form.active} onChange={e=>F({...form,active:e.target.checked})}/>Aktif tarla</label></div>
<ErrorBox message={error || customers.error} />
{!customers.loading && !customers.error && !customers.data.some(c=>c.active) && <p className="notice">Tarla kaydetmek için önce Müşteriler ekranından bir müşteri ekleyin.</p>}
            <div className="actions field-form-footer">
<button disabled={busy||queryBusy||!customers.data.some(c=>c.active)}>{busy?'Kaydediliyor…':'Tarlayı kaydet'}</button>
              <button
                type="button"
                className="secondary"
                onClick={() => F(null)}
              >
                Vazgeç
              </button>
            </div>
        </form>
      )}
      <Empty {...list} count={list.data.length} />
      <div className="cards">
        {!list.loading &&
          !list.error &&
          list.data.map((f) => (
            <article className="panel" key={f.id}>
              <div className="row">
                <h2>{f.name}</h2>
                <strong>{number(f.area, "dekar")}</strong>
              </div>
              <p>
                {f.customer.name} · {f.crop}
              </p>
              <p className="muted">
                {f.neighborhood} / {f.district} · {f.active ? "Aktif" : "Arşiv"}
              </p>
              {f.source === "SYNTHETIC" && (
                <span className="badge warning">Sentetik</span>
              )}
              <FieldMap
                latitude={f.latitude}
                longitude={f.longitude}
                boundary={f.boundary}
              />
              <button
                className="secondary"
                onClick={() => {
                  const { customer, researchId, source, ...value } = f;
                  F(value);
                  S(f.boundary ? JSON.stringify(f.boundary) : "");
                  E("");
                }}
              >
                Düzenle / arşivle
              </button>
            </article>
          ))}
      </div>
      <Pager page={page} setPage={P} total={list.total} />
    </>
  );
}
function Drones() {
  const [refresh, R] = useState(0),
    [form, F] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false);
  const list = useList("/drones", "pageSize=100", refresh);
  return (
    <>
      <PageHead
        title="Ekipman"
        description="Drone özellikleri kayıt amaçlıdır. Otomatik drone bağlantısı yoktur."
      >
        <button
          onClick={() =>
            F({ name: "", model: "", tankLiters: "", active: true })
          }
        >
          + Drone ekle
        </button>
      </PageHead>
      {form && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            B(true);
            try {
              const { id, ...body } = form;
              await api("/drones" + (id ? "/" + id : ""), id ? "PUT" : "POST", {
                ...body,
                tankLiters: body.tankLiters || null,
              });
              F(null);
              R(refresh + 1);
            } catch (err) {
              E((err as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          <Input
            label="Ad"
            value={form.name}
            required
            onChange={(e) => F({ ...form, name: e.target.value })}
          />
          <Input
            label="Model"
            value={form.model}
            required
            onChange={(e) => F({ ...form, model: e.target.value })}
          />
          <Input
            label="Tank kapasitesi (litre, isteğe bağlı)"
            value={form.tankLiters ?? ""}
            onChange={(e) => F({ ...form, tankLiters: e.target.value })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => F({ ...form, active: e.target.checked })}
            />
            Aktif
          </label>
          <div className="wide">
            <ErrorBox message={error} />
            <div className="actions">
              <button disabled={busy}>Kaydet</button>
              <button
                type="button"
                className="secondary"
                onClick={() => F(null)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </form>
      )}
      <Empty {...list} count={list.data.length} />
      <div className="cards">
        {list.data.map((d) => (
          <article className="panel" key={d.id}>
            <h2>{d.name}</h2>
            <p>
              {d.model} · {number(d.tankLiters, "litre")}
            </p>
            <p>{d.active ? "Aktif" : "Arşiv"}</p>
            <button
              className="secondary"
              onClick={() => {
                F(d);
                E("");
              }}
            >
              Düzenle
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function OrderForm({
  existing,
  onDone,
  onCancel,
}: {
  existing?: any;
  onDone: () => void;
  onCancel: () => void;
}) {
  const fields = useList("/fields", "pageSize=100"),
    operators = useList("/operators"),
    drones = useList("/drones", "pageSize=100");
  const [f, F] = useState<any>({
    fieldId: existing?.fieldId ?? "",
    operatorId: existing?.operatorId ?? "",
    droneId: existing?.droneId ?? "",
    plannedStart: existing?.plannedStart
      ? localInput(existing.plannedStart)
      : "",
    plannedEnd: existing?.plannedEnd ? localInput(existing.plannedEnd) : "",
    sequence: existing?.sequence ?? 0,
    service: "Tarımsal drone hizmeti",
    plannedArea: existing?.plannedArea ?? "",
    plannedAreaOrigin: "OPERATOR_ESTIMATE",
    agreedPrice: existing?.agreedPrice ?? "", pricing:undefined as any,
    notes: "",
    crewSize: existing?.snapshot?.settings?.crewSize ?? "",
    growthStage: existing?.snapshot?.settings?.growthStage ?? "",
    refillAccess: existing?.snapshot?.settings?.refillAccess ?? "UNKNOWN",
    plannedSettings: existing?.snapshot?.settings?.plannedSettings ?? "",
    manualTravelMinutes:
      existing?.snapshot?.settings?.manualTravelMinutes ?? "",
  });
  const [busy, B] = useState(false),
    [error, E] = useState("");
  const update = (k: string, v: any) => F({ ...f, [k]: v });
  return (
    <form
      className="panel form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        B(true);
        E("");
        try {
          const settings = {
            crewSize: f.crewSize === "" ? null : Number(f.crewSize),
            growthStage: f.growthStage || null,
            refillAccess: f.refillAccess,
            plannedSettings: f.plannedSettings || null,
            manualTravelMinutes:
              f.manualTravelMinutes === ""
                ? null
                : Number(f.manualTravelMinutes),
          };
          const schedule = {
            operatorId: f.operatorId || null,
            droneId: f.droneId || null,
            plannedStart: f.plannedStart ? iso(f.plannedStart) : null,
            plannedEnd: f.plannedEnd ? iso(f.plannedEnd) : null,
            sequence: Number(f.sequence),
            settings,
          };
          await api(
            existing ? `/orders/${existing.id}/schedule` : "/orders",
            existing ? "PUT" : "POST",
            existing
              ? schedule
              : {
                  ...schedule,
                  fieldId: f.fieldId,
                  service: f.service,
                  plannedArea: f.plannedArea,
                  plannedAreaOrigin: f.plannedAreaOrigin,
                  agreedPrice: f.agreedPrice, pricing:f.pricing,
                  notes: f.notes,
                },
          );
          onDone();
        } catch (err) {
          E((err as Error).message);
        } finally {
          B(false);
        }
      }}
    >
      <h2 className="wide">
        {existing ? "Programı düzenle" : "Yeni hizmet ziyareti"}
      </h2>
      {!existing && (
        <>
          <Select
            label="Tarla / müşteri"
            value={f.fieldId}
            required
            onChange={(e) => {
              const field = fields.data.find((x) => x.id === e.target.value);
              F({
                ...f,
                fieldId: e.target.value,
                plannedArea: field?.area ?? "",
              });
            }}
          >
            <option value="">Seçin</option>
            {fields.data
              .filter((x) => x.active)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.customer.name} / {x.name}
                </option>
              ))}
          </Select>
          <Input
            label="Hizmet türü"
            value={f.service}
            required
            onChange={(e) => update("service", e.target.value)}
          />
          <Input
            label="Planlanan alan (dekar)"
            value={f.plannedArea}
            required
            onChange={(e) => update("plannedArea", e.target.value)}
          />
          <PriceCalculator fieldId={f.fieldId} onChange={(pricing,agreedPrice,dekar)=>F((old:any)=>({...old,pricing,agreedPrice,plannedArea:dekar??old.plannedArea,plannedAreaOrigin:"EXTERNAL"}))}/>
          <Select
            label="Planlanan alanın kaynağı"
            value={f.plannedAreaOrigin}
            onChange={(e) => update("plannedAreaOrigin", e.target.value)}
          >
            <option value="OPERATOR_ESTIMATE">Operatör tahmini</option>
            <option value="MEASURED">Ölçülmüş</option>
            <option value="EXTERNAL">Dış kaynak</option>
          </Select>
        </>
      )}
      <Select
        label="Operatör"
        value={f.operatorId}
        onChange={(e) => update("operatorId", e.target.value)}
      >
        <option value="">Atanmadı</option>
        {operators.data.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </Select>
      <Select
        label="Drone"
        value={f.droneId}
        onChange={(e) => update("droneId", e.target.value)}
      >
        <option value="">Atanmadı</option>
        {drones.data
          .filter((x) => x.active)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
      </Select>
      <Input
        label="Planlanan başlangıç (İstanbul)"
        type="datetime-local"
        value={f.plannedStart}
        onChange={(e) => update("plannedStart", e.target.value)}
      />
      <Input
        label="Planlanan bitiş (İstanbul)"
        type="datetime-local"
        value={f.plannedEnd}
        onChange={(e) => update("plannedEnd", e.target.value)}
      />
      <Input
        label="Günlük sıra"
        type="number"
        min="0"
        value={f.sequence}
        onChange={(e) => update("sequence", e.target.value)}
      />
      <Input
        label="Planlanan ekip kişi sayısı (isteğe bağlı)"
        type="number"
        min="1"
        value={f.crewSize}
        onChange={(e) => update("crewSize", e.target.value)}
      />
      <Input
        label="Gelişim dönemi (isteğe bağlı)"
        value={f.growthStage}
        onChange={(e) => update("growthStage", e.target.value)}
      />
      <Select
        label="Dolum erişimi"
        value={f.refillAccess}
        onChange={(e) => update("refillAccess", e.target.value)}
      >
        <option value="UNKNOWN">Bilinmiyor</option>
        <option value="KNOWN_NEAR">Yakın olduğu biliniyor</option>
        <option value="KNOWN_FAR">Uzak olduğu biliniyor</option>
      </Select>
      <Input
        label="Manuel ulaşım süresi (dakika, isteğe bağlı)"
        type="number"
        min="0"
        value={f.manualTravelMinutes}
        onChange={(e) => update("manualTravelMinutes", e.target.value)}
      />
      <Text
        label="Planlanan ayarlar (kayıt; doz önerisi verilmez)"
        value={f.plannedSettings}
        onChange={(e) => update("plannedSettings", e.target.value)}
      />
      {!existing && (
        <Text
          label="İş notu"
          value={f.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      )}
      <div className="wide">
        <ErrorBox
          message={error || fields.error || operators.error || drones.error}
        />
        <div className="actions">
          <button disabled={busy || (!existing && !f.pricing)}>Kaydet</button>
          <button className="secondary" type="button" onClick={onCancel}>
            Vazgeç
          </button>
        </div>
      </div>
    </form>
  );
}
function Orders({
  user,
  calendar = false,
  onOpen,
}: {
  user: User;
  calendar?: boolean;
  onOpen: (id: string) => void;
}) {
  const [page, P] = useState(1),
    [refresh, R] = useState(0),
    [form, F] = useState<any>(null),
    [day, D] = useState(today()),
    [status, S] = useState(""),
    [suggestion, G] = useState<any>(null),
    [error, E] = useState("");
  const params = new URLSearchParams({ page: String(page) });
  if (calendar) {
    params.set("from", iso(day + "T00:00:00"));
    const next = new Date(day + "T00:00:00+03:00");
    next.setUTCDate(next.getUTCDate() + 1);
    params.set("to", next.toISOString());
  }
  if (status) params.set("status", status);
  const list = useList("/orders", params.toString(), refresh);
  return (
    <>
      <PageHead
        title={calendar ? "Günlük program" : "İş emirleri"}
        description={
          calendar
            ? "Süre aralıkları ve yönetici tarafından düzenlenen günlük sıra."
            : "Bir iş emri, bir tarlada bir hizmet ziyaretidir."
        }
      >
        {user.role === "ADMIN" && (
          <button onClick={() => F({})}>+ İş emri</button>
        )}
      </PageHead>
      <div className="filters">
        {calendar && (
          <Input
            label="Program günü (İstanbul)"
            type="date"
            value={day}
            onChange={(e) => {
              D(e.target.value);
              P(1);
              G(null);
            }}
          />
        )}
        <Select
          label="Durum"
          value={status}
          onChange={(e) => {
            S(e.target.value);
            P(1);
          }}
        >
          <option value="">Tümü</option>
          {[
            "REQUESTED",
            "PLANNED",
            "RUNNING",
            "COMPLETED",
            "POSTPONED",
            "CANCELLED",
          ].map((s) => (
            <option value={s} key={s}>
              {labels[s]}
            </option>
          ))}
        </Select>
        {calendar && user.role === "ADMIN" && (
          <button
            className="secondary"
            onClick={async () => {
              E("");
              try {
                G(await api("/planning/suggestion?" + params));
              } catch (e) {
                E((e as Error).message);
              }
            }}
          >
            Süre / sıra taslağı
          </button>
        )}
      </div>
      <ErrorBox message={error} />
      {suggestion && (
        <div className="panel">
          <p>{suggestion.notice}</p>
          {suggestion.data.map((x: any) => (
            <p key={x.id}>
              {x.field}:{" "}
              {x.missing ??
                `${date(x.suggestedStart)} – ${date(x.suggestedEnd)}`}
            </p>
          ))}
        </div>
      )}
      {form && (
        <OrderForm
          existing={form.id ? form : undefined}
          onCancel={() => F(null)}
          onDone={() => {
            F(null);
            R(refresh + 1);
          }}
        />
      )}
      <Empty {...list} count={list.data.length} />
      <div className="order-list">
        {!list.loading &&
          !list.error &&
          list.data.map((o) => (
            <article className="panel order-row" key={o.id}>
              <div className="order-date">
                <strong>
                  {o.plannedStart
                    ? new Intl.DateTimeFormat("tr-TR", {
                        timeZone: "Europe/Istanbul",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(o.plannedStart))
                    : "—"}
                </strong>
                <small>#{o.sequence + 1}</small>
              </div>
              <div className="order-info">
                <span
                  className={
                    "badge " + (o.status === "RUNNING" ? "running" : "")
                  }
                >
                  {labels[o.status]}
                </span>
                {o.source === "SYNTHETIC" && (
                  <span className="badge warning">Sentetik</span>
                )}
                <h2>{o.field.name}</h2>
                <p>
                  {o.customer.name} · {o.service}
                </p>
                <p className="muted">
                  {number(o.plannedArea, "dekar")} ·{" "}
                  {o.operator?.name ?? "Operatör atanmadı"} ·{" "}
                  {date(o.plannedStart)}
                </p>
              </div>
              <div className="actions">
                <button onClick={() => onOpen(o.id)}>İşi aç →</button>
                {user.role === "ADMIN" &&
                  !o.events.length &&
                  ["REQUESTED", "PLANNED", "POSTPONED"].includes(o.status) && (
                    <button className="secondary" onClick={() => F(o)}>
                      Programı düzenle
                    </button>
                  )}
              </div>
            </article>
          ))}
      </div>
      <Pager page={page} setPage={P} total={list.total} />
    </>
  );
}
function WorkDetail({
  id,
  user,
  onBack,
}: {
  id: string;
  user: User;
  onBack: () => void;
}) {
  const [o, O] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [refresh, R] = useState(0),
    [pending, K] = useState<any>(null),
    [at, A] = useState(localInput()),
    [kind, J] = useState(""),
    [eventOrigin, EO] = useState("MEASURED"),
    [actualArea, AA] = useState(""),
    [actualAreaOrigin, AO] = useState("OPERATOR_ESTIMATE"),
    [correction, C] = useState<any>(null),
    [reason, N] = useState(""),
    [amount, M] = useState(""),
    [adjust, V] = useState(""),
    [prediction, Q] = useState<any>(null),
    [paymentKey, PK] = useState(crypto.randomUUID()),
    [pendingPayment, PP] = useState<any>(null);
  useEffect(() => {
    api("/orders/" + id)
      .then(O)
      .catch((e) => E(e.message));
  }, [id, refresh]);
  const act = async (fn: () => Promise<any>) => {
    B(true);
    E("");
    try {
      await fn();
      R(refresh + 1);
    } catch (e) {
      E((e as Error).message);
    } finally {
      B(false);
    }
  };
  if (!o)
    return (
      <>
        <button className="secondary" onClick={onBack}>
          ← İşlere dön
        </button>
        <ErrorBox message={error} />
        <p>İş yükleniyor…</p>
      </>
    );
  const open = o.operation.open;
  const actions =
    o.status === "PLANNED"
      ? ["PREPARATION"]
      : o.status === "RUNNING"
        ? open === "flight"
          ? ["FLIGHT_END"]
          : open === "waiting"
            ? ["WAIT_END"]
            : ["FLIGHT_START", "REFILL", "BATTERY", "WAIT_START", "COMPLETE"]
        : [];
  return (
    <>
      <button className="secondary" onClick={onBack}>
        ← İşlere dön
      </button>
      <PageHead
        title={o.field.name}
        description={`${o.customer.name} · ${number(o.plannedArea, "dekar")} · ${labels[o.status]}`}
      />
      <ErrorBox message={error} />
      <div className="job-summary panel"><h2>Yapılacak iş</h2><p><strong>{o.service}</strong> · {number(o.plannedArea,"dekar")}</p><p>{date(o.plannedStart)} · {labels[o.status]}</p></div><details className="panel"><summary>Yol güzergâhını göster</summary><OrderRoadRoute id={id}/></details>
      <div className="detail-grid">
        <section className="panel">
          <h2>Müşteri ve konum</h2>
          <a href={"tel:" + o.customer.phone}>{o.customer.phone}</a>
          <p>
            {o.field.neighborhood} / {o.field.district}
          </p>
          <p>{o.field.accessNotes || "Erişim notu yok."}</p>
          <p>{o.notes}</p>
          <FieldMap
            latitude={o.field.latitude}
            longitude={o.field.longitude}
            boundary={o.field.boundary}
          />
          <p className="hint">
            Konum işaretlemesi işletme kaydıdır; resmî parsel doğrulaması
            değildir.
          </p>
        </section>
        <section className="panel">
          <span className="eyebrow">SAHA KAYDI</span>
          <h2>İşi başlat / bitir</h2>
          <p>
            Hazırlık başlangıcından ayrılmaya hazır olana kadar. Bekleme dahil,
            ulaşım hariç.
          </p>
          <div className="metric">
            <strong>{number(o.operation.totalMinutes, "dakika")}</strong>
            <span>Toplam saha süresi</span>
          </div>
          {open && (
            <p role="status">Şu an: {labels[open]}</p>
          )}
          <div className="touch-actions">
            {actions.map((k) => (
              <button
                disabled={busy}
                key={k}
                onClick={() => {
                  J(k);
                  A(localInput());
                  K(null);
                }}
              >
                {labels[k]}
              </button>
            ))}
          </div>
          {kind && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const body = pending ?? {
                  kind,
                  at: iso(at),
                  idempotencyKey: crypto.randomUUID(),
                  origin: eventOrigin,
                  ...(kind === "COMPLETE"
                    ? { actualArea: actualArea || null, actualAreaOrigin }
                    : {}),
                };
                K(body);
                await act(async () => {
                  await api("/orders/" + id + "/events", "POST", body);
                  J("");
                  K(null);
                });
              }}
            >
              <p><strong>{labels[kind]}</strong> işlemini kaydedin.</p><details><summary>Saati veya kayıt bilgisini değiştir</summary>              <Input
                label="İşlem zamanı"
                type="datetime-local"
                step="1"
                value={at}
                disabled={Boolean(pending)}
                onChange={(e) => A(e.target.value)}
                required
              />
              <p>
                {labels[kind]}{" "}
                {pending &&
                  "• Kaydedilmedi; aynı isteği tekrar deneyebilirsiniz."}
              </p>
              <Select
                label="Zaman bilgisinin kaynağı"
                value={eventOrigin}
                disabled={Boolean(pending)}
                onChange={(e) => EO(e.target.value)}
              >
                <option value="MEASURED">Ölçülmüş</option>
                <option value="OPERATOR_ESTIMATE">Operatör tahmini</option>
                <option value="EXTERNAL">Dış kaynaktan aktarılmış</option>
              </Select>
              </details>              {kind === "COMPLETE" && (
                <>
                  <Input
                    label="Gerçek işlenen alan (dekar, bilinmiyorsa boş bırakın)"
                    value={actualArea}
                    disabled={Boolean(pending)}
                    onChange={(e) => AA(e.target.value)}
                  />
                  <Select
                    label="İşlenen alan bilgisinin kaynağı"
                    value={actualAreaOrigin}
                    disabled={Boolean(pending)}
                    onChange={(e) => AO(e.target.value)}
                  >
                    <option value="OPERATOR_ESTIMATE">Operatör tahmini</option>
                    <option value="MEASURED">Ölçülmüş</option>
                    <option value="EXTERNAL">Dış kaynak</option>
                  </Select>
                </>
              )}
              <div className="actions">
                <button disabled={busy}>Onayla ve kaydet</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    J("");
                    K(null);
                  }}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}
          <details className="work-history"><summary>Süreler ve kayıt geçmişi</summary><div className="durations">
            {Object.entries(o.operation.totals).map(([k, v]) => (
              <div key={k}>
                <span>{labels[k]}</span>
                <strong>{number(v, "dk")}</strong>
              </div>
            ))}
          </div>
          <h3>İşlem geçmişi</h3>
          {!o.events.length && <p className="muted">Henüz olay kaydı yok.</p>}
          {o.events.map((e: any) => (
            <div className="event-row" key={e.id}>
              <div>
                {labels[e.kind]}
                <small>
                  {date(e.at)} ·{" "}
                  {e.origin === "MEASURED"
                    ? "Ölçülmüş"
                    : e.origin === "EXTERNAL"
                      ? "Dış kaynak"
                      : "Operatör tahmini"}
                </small>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  C({
                    id: e.id,
                    kind: e.kind,
                    at: localInput(e.at),
                    origin: e.origin,
                  });
                  N("");
                }}
              >
                Düzelt
              </button>
            </div>
          ))}
          </details>{correction && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(`/orders/${id}/events/${correction.id}`, "PUT", {
                    kind: correction.kind,
                    at: iso(correction.at),
                    origin: correction.origin,
                    reason,
                  });
                  C(null);
                });
              }}
            >
              <Select
                label="Olay türü"
                value={correction.kind}
                onChange={(e) => C({ ...correction, kind: e.target.value })}
              >
                {[
                  "PREPARATION",
                  "FLIGHT_START",
                  "FLIGHT_END",
                  "REFILL",
                  "BATTERY",
                  "WAIT_START",
                  "WAIT_END",
                  "COMPLETE",
                ].map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </Select>
              <Input
                label="Düzeltilmiş zaman"
                type="datetime-local"
                step="1"
                value={correction.at}
                onChange={(e) => C({ ...correction, at: e.target.value })}
              />
              <Text
                label="Düzeltme gerekçesi (önceki değer saklanır)"
                value={reason}
                minLength={5}
                required
                onChange={(e) => N(e.target.value)}
              />
              <Select
                label="Düzeltilmiş zamanın kaynağı"
                value={correction.origin}
                onChange={(e) => C({ ...correction, origin: e.target.value })}
              >
                <option value="MEASURED">Ölçülmüş</option>
                <option value="OPERATOR_ESTIMATE">Operatör tahmini</option>
                <option value="EXTERNAL">Dış kaynak</option>
              </Select>
              <div className="actions">
                <button disabled={busy}>Düzeltmeyi kaydet</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => C(null)}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
      {user.role === "ADMIN" && (
        <section className="panel">
          <h2>Hizmet bedeli ve tahsilat</h2>{o.snapshot?.pricing&&<PriceSummary value={o.snapshot.pricing}/>}
          <div className="metrics">
            <div className="metric">
              <span>Kararlaştırılmış</span>
              <strong>{number(o.agreedPrice, "TL")}</strong>
            </div>
            <div className="metric">
              <span>Düzeltme</span>
              <strong>{number(o.adjustment, "TL")}</strong>
            </div>
            <div className="metric">
              <span>Kalan bakiye</span>
              <strong>{number(o.balance, "TL")}</strong>
            </div>
          </div>
          <div className="form-grid">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const body = pendingPayment ?? {
                  amount,
                  at: new Date().toISOString(),
                  idempotencyKey: paymentKey,
                };
                PP(body);
                act(async () => {
                  await api(`/orders/${id}/payments`, "POST", body);
                  M("");
                  PP(null);
                  PK(crypto.randomUUID());
                });
              }}
            >
              <Input
                label="Kısmi tahsilat (TL)"
                disabled={Boolean(pendingPayment)}
                value={amount}
                required
                onChange={(e) => M(e.target.value)}
              />
              <button disabled={busy}>Tahsilat kaydet</button>
            </form>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(`/orders/${id}/adjustment`, "POST", {
                    adjustment: adjust,
                    reason,
                  });
                  V("");
                  N("");
                });
              }}
            >
              <Input
                label="Toplam bedel düzeltmesi (TL; negatif olabilir)"
                value={adjust}
                required
                onChange={(e) => V(e.target.value)}
              />
              <Text
                label="Düzeltme gerekçesi"
                value={reason}
                required
                minLength={5}
                onChange={(e) => N(e.target.value)}
              />
              <button disabled={busy}>Bedeli düzelt</button>
            </form>
          </div>
          {o.payments.map((p: any) => (
            <p key={p.id}>
              {date(p.at)} · {number(p.amount, "TL")}
            </p>
          ))}
          <h3>İş durumu / ön tahmin</h3>
          {["REQUESTED", "PLANNED", "RUNNING", "POSTPONED"].includes(
            o.status,
          ) && (
            <div className="actions">
              <Input
                label="Erteleme / iptal gerekçesi"
                value={reason}
                onChange={(e) => N(e.target.value)}
              />
              {["PLANNED", "RUNNING"].includes(o.status) && (
                <button
                  disabled={busy || reason.length < 3}
                  className="secondary"
                  onClick={() =>
                    act(() =>
                      api(`/orders/${id}/status`, "POST", {
                        status: "POSTPONED",
                        reason,
                      }),
                    )
                  }
                >
                  Ertele
                </button>
              )}
              <button
                disabled={busy || reason.length < 3}
                className="secondary"
                onClick={() =>
                  act(() =>
                    api(`/orders/${id}/status`, "POST", {
                      status: "CANCELLED",
                      reason,
                    }),
                  )
                }
              >
                İptal et
              </button>
            </div>
          )}
          {!o.events.length && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                act(async () =>
                  Q(await api(`/orders/${id}/prediction`, "POST", {})),
                )
              }
            >
              Baseline ön tahmini kaydet
            </button>
          )}
          {prediction && (
            <p>
              {prediction.minutes
                ? `Alan baseline: ${number(prediction.minutes, "dakika")} (model başarısı değerlendirilmedi)`
                : "Yeterli gerçek tamamlanmış veri yok."}
            </p>
          )}
          <p className="hint">
            Muhasebe / fatura veya otomatik ödeme entegrasyonu yoktur.
          </p>
        </section>
      )}
    </>
  );
}
function Reports() {
  const [orderPage, OP] = useState(1),
    [orderSearch, OS] = useState("");
  const orderOptions = useList(
    "/orders",
    new URLSearchParams({ page: String(orderPage), q: orderSearch }).toString(),
  );
  const [from, F] = useState(""),
    [to, T] = useState(""),
    [report, R] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [expense, X] = useState({
      kind: "TRANSPORT",
      amount: "",
      note: "",
      orderIds: [] as string[],
      allocationRule: "DIRECT",
    });
  const load = async () => {
    B(true);
    E("");
    const p = new URLSearchParams();
    if (from) p.set("from", iso(from + "T00:00:00"));
    if (to) p.set("to", dayEnd(to));
    try {
      R(await api("/reports?" + p));
    } catch (e) {
      E((e as Error).message);
    } finally {
      B(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <PageHead
        title="Finans ve rapor"
        description="İç işletme takibi. TL, dekar ve dakika cinsinden gerçek kayıtlar."
      />
      <div className="filters">
        <Input
          label="Başlangıç"
          type="date"
          value={from}
          onChange={(e) => F(e.target.value)}
        />
        <Input
          label="Bitiş"
          type="date"
          value={to}
          onChange={(e) => T(e.target.value)}
        />
        <button disabled={busy} onClick={load}>
          Raporu getir
        </button>
      </div>
      <ErrorBox message={error} />
      {busy && <p>Rapor yükleniyor…</p>}
      {report && !error && (
        <>
          <div className="metrics">
            {[
              ["Tahsil edilen", report.collected, "TL"],
              ["Kalan alacak", report.outstanding, "TL"],
              ["Giderler", report.expenseTotal, "TL"],
              ["Kaydedilen işlenen alan", report.processedArea, "dekar"],
            ].map(([l, v, u]) => (
              <div className="panel metric" key={l}>
                <span>{l}</span>
                <strong>{number(v, u)}</strong>
              </div>
            ))}
          </div>
          <p className="hint">{report.basis}</p>
          <section className="panel">
            <h2>Operasyon süreleri</h2>
            {!report.operations.length && <p>Tamamlanmış iş yok.</p>}
            {report.operations.map((o: any) => (
              <div className="event-row" key={o.id}>
                <span>
                  {o.field} · {number(o.area, "dekar")}
                </span>
                <strong>
                  {number(o.totalMinutes, "dk")} ·{" "}
                  {number(Number(o.totalMinutes) / Number(o.area), "dk/dekar")}
                </strong>
              </div>
            ))}
          </section>
        </>
      )}
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          B(true);
          E("");
          try {
            await api("/expenses", "POST", {
              kind: expense.kind,
              amount: expense.amount,
              note: expense.note,
              orderIds: expense.orderIds,
              allocationRule: expense.allocationRule,
              at: new Date().toISOString(),
            });
            X({ ...expense, amount: "", note: "" });
            await load();
          } catch (e) {
            E((e as Error).message);
          } finally {
            B(false);
          }
        }}
      >
        <h2 className="wide">Gider kaydı</h2>
        <Select
          label="Tür"
          value={expense.kind}
          onChange={(e) => X({ ...expense, kind: e.target.value })}
        >
          {["TRANSPORT", "ENERGY", "LABOR", "CONSUMABLE", "OTHER"].map((k) => (
            <option key={k} value={k}>
              {labels[k]}
            </option>
          ))}
        </Select>
        <Input
          label="Tutar (TL)"
          value={expense.amount}
          required
          onChange={(e) => X({ ...expense, amount: e.target.value })}
        />
        <fieldset className="wide">
          <legend>Giderin ait olduğu işler (seçilmezse günlük gider)</legend>
          <Input
            label="Müşteri / tarla ara"
            value={orderSearch}
            onChange={(e) => {
              OS(e.target.value);
              OP(1);
            }}
          />
          <Empty {...orderOptions} count={orderOptions.data.length} />
          {orderOptions.data.map((o) => (
            <label className="check" key={o.id}>
              <input
                type="checkbox"
                checked={expense.orderIds.includes(o.id)}
                onChange={(e) =>
                  X({
                    ...expense,
                    orderIds: e.target.checked
                      ? [...expense.orderIds, o.id]
                      : expense.orderIds.filter((id) => id !== o.id),
                  })
                }
              />
              {o.customer.name} / {o.field.name} · {date(o.plannedStart)}
            </label>
          ))}
          <Pager page={orderPage} setPage={OP} total={orderOptions.total} />
          <p className="hint">{expense.orderIds.length} iş seçildi.</p>
        </fieldset>
        <Select
          label="Dağıtım kuralı"
          value={expense.allocationRule}
          onChange={(e) => X({ ...expense, allocationRule: e.target.value })}
        >
          <option value="DIRECT">Tek işe doğrudan</option>
          <option value="EQUAL">Seçilen işlere eşit</option>
        </Select>
        <Text
          label="Not"
          value={expense.note}
          onChange={(e) => X({ ...expense, note: e.target.value })}
        />
        <div>
          <p className="hint">
            Eşit dağıtımda kuruş farkı ilk işlerden başlayarak eklenir. Boş
            seçimde gider dağıtılmadan saklanır.
          </p>
          <button disabled={busy}>Gider kaydet</button>
        </div>
      </form>
      {report && !error && (
        <section className="panel">
          <h2>Gider geçmişi</h2>
          {!report.expenses.length && <p>Gider yok.</p>}
          {report.expenses.map((e: any) => (
            <p key={e.id}>
              {date(e.at)} · {labels[e.kind]} · {number(e.amount, "TL")} ·{" "}
              {e.allocationRule}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Research() {
  const [result, R] = useState<any>(null),
    [error, E] = useState(""),
    [busy, B] = useState(false);
  return (
    <>
      <PageHead
        title="Araştırma paketi"
        description="Bir satır bir tamamlanmış gerçek iş. Sentetik kayıtlar pakete alınmaz."
      />
      <section className="panel">
        <span className="eyebrow">ARAŞTIRMA SORUSU</span>
        <h2>Önceden bilinen özellikler süre hatasını azaltıyor mu?</h2>
        <p>
          Alan × eğitim verisindeki ortalama dakika/dekar baseline, basit
          regresyon ve ağaç modeli aynı zaman bölünmesinde karşılaştırılacak.
        </p>
        <p>
          Gerçek model eğitimi ve saha pilotu veri erişimini bekliyor. Başarı
          oranı veya tasarruf iddiası yok.
        </p>
        <div className="notice">
          Araştırma paketi ad, telefon, not, ham ada-parsel, tarih ve konum
          içermez. Nadir özelliklerden yeniden tanımlanma riski paylaşım öncesi
          incelenmelidir. Otomatik yayımlama yapılmaz.
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            B(true);
            E("");
            try {
              R(await api("/exports/research", "POST", {}));
            } catch (e) {
              E((e as Error).message);
            } finally {
              B(false);
            }
          }}
        >
          {busy ? "Hazırlanıyor…" : "Araştırma paketini hazırla"}
        </button>
        <ErrorBox message={error} />
        {result && (
          <div>
            <h3>
              {result.manifest.count} gerçek iş · {result.manifest.version}
            </h3>
            {result.manifest.count === 0 && (
              <p>Uygun saha verisi yok; CSV yalnızca başlık içerir.</p>
            )}
            <p className="hint">
              Mendeley Data için bu dosyaları birlikte saklayın. Yayımlanmadı,
              DOI oluşturulmadı.
            </p>
            <div className="actions">
              {Object.entries(result.files).map(([name, content]) => (
                <button
                  key={name}
                  className="secondary"
                  onClick={() => download(name, String(content))}
                >
                  {name} ↓
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>İşletmeye özel dışa aktarım</h2>
        <p>
          Bu CSV müşteri iletişim bilgisi içerir; kamu araştırma paketinden
          ayrıdır.
        </p>
        <button
          className="secondary"
          onClick={async () => {
            E("");
            try {
              const r = await fetch("/api/exports/business");
              if (!r.ok) throw Error("İşletme CSV indirilemedi.");
              download("isletme-ozel.csv", await r.text(), "text/csv");
            } catch (e) {
              E((e as Error).message);
            }
          }}
        >
          Özel işletme CSV ↓
        </button>
      </section>
    </>
  );
}
function Dashboard({
  user,
  onOpen,
}: {
  user: User;
  onOpen: (id: string) => void;
}) {
  const params = new URLSearchParams({
    from: iso(today() + "T00:00:00"),
    to: dayEnd(today()),
  });
  const list = useList("/orders", params.toString());
  const [report, R] = useState<any>(null),
    [error, E] = useState("");
  useEffect(() => {
    if (user.role === "ADMIN")
      api("/reports")
        .then(R)
        .catch((e) => E(e.message));
  }, [user.role]);
  return (
    <>
      <PageHead
        title="Bugün sahada"
        description={`${new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "full" }).format(new Date())} · Europe/Istanbul`}
      />
      {user.role === "ADMIN" && (
        <>
          <ErrorBox message={error} />
          {report && !error && (
            <div className="metrics">
              {[
                ["Bekleyen işler", report.pending, "iş"],
                ["Kaydedilen işlenen alan", report.processedArea, "dekar"],
                ["Tahsil edilen", report.collected, "TL"],
                ["Kalan alacak", report.outstanding, "TL"],
              ].map(([l, v, u]) => (
                <div className="panel metric" key={l}>
                  <span>{l}</span>
                  <strong>{number(v, u)}</strong>
                </div>
              ))}
            </div>
          )}
          <p className="hint">
            Finans özeti tüm kayıtları kapsar. Sentetik seed kayıtları kaynak
            etiketiyle ayrılır.
          </p>
        </>
      )}
      <div className="section-head">
        <h2>Bugünün işleri</h2>
        <span className="badge">{list.total} ziyaret</span>
      </div>
      <Empty {...list} count={list.data.length} />
      {!list.loading &&
        !list.error &&
        list.data.map((o) => (
          <article className="panel order-row" key={o.id}>
            <div className="order-info">
              <span className="badge">{labels[o.status]}</span>
              {o.source === "SYNTHETIC" && (
                <span className="badge warning">Sentetik</span>
              )}
              <h2>{o.field.name}</h2>
              <p>
                {o.customer.name} · {number(o.plannedArea, "dekar")}
              </p>
              <p className="muted">
                {date(o.plannedStart)} · {o.operator?.name ?? "Atanmadı"}
              </p>
            </div>
            <button onClick={() => onOpen(o.id)}>İşi aç →</button>
          </article>
        ))}
      <div className="notice">
        Bağlantı yokken kayıt yapılmaz. Başarısız istekte formu koruyup yeniden
        deneyin.
      </div>
    </>
  );
}
function App() {
  const [advanced,Advanced] = useState(false);
  const [user, U] = useState<User | null>(null),
    [loading, L] = useState(true),
    [page, P] = useState("dashboard"),
    [selected, S] = useState<string | null>(null),
    [error, E] = useState("");
  useEffect(() => {
    api("/auth/me")
      .then((r) => {
        U(r.user);
        setCsrf(r.csrf);
      })
      .catch(() => {})
      .finally(() => L(false));
  }, []);
  if (loading) return <main className="empty">Oturum kontrol ediliyor…</main>;
  if (!user) return <Login onLogin={U} />;
  const nav = [
    ["dashboard", "◫", "Genel bakış"],
    ["calendar", "▦", "Günlük program"],
    ["orders", "≡", "İş emirleri"],
    ...(user.role === "ADMIN"
      ? [
          ["customers", "♙", "Müşteriler"],
          ["fields", "◇", "Tarlalar"],
          ["parcels", "⌖", "Arsa / parsel sorgu"],
          ...(advanced?[["weather", "☁", "Hava ayrıntıları"]]:[]),
          ["planning", "▤", "Randevu ve rota"],
          ["drones", "✣", "Ekipman"],
          ["reports", "₺", "Finans ve rapor"],
          ...(advanced?[["research", "⌁", "Araştırma"]]:[]),
        ]
      : []),
  ];
  const open = (id: string) => {
    S(id);
    P("detail");
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="wordmark">◈ SAHA</div>
        <p className="sidebar-sub">SEYDİŞEHİR DRONE HİZMETİ</p>
        <nav aria-label="Ana gezinme">
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              className={page === key ? "nav active" : "nav"}
              onClick={() => {
                P(key);
                S(null);
              }}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </button>
          ))}
        </nav>{user.role==="ADMIN"&&<button className="nav" onClick={()=>{Advanced(!advanced);P("dashboard");S(null);}}>{advanced?"Temel ekrana dön":"Gelişmiş araçlar"}</button>}
        <div className="sidebar-bottom">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === "ADMIN" ? "Yönetici" : "Operatör"}</small>
          </div>
          <button
            className="logout"
            onClick={async () => {
              try {
                await api("/auth/logout", "POST", {});
                U(null);
                setCsrf("");
              } catch (e) {
                E((e as Error).message);
              }
            }}
          >
            Çıkış
          </button>
        </div>
      </aside>
      <main className="content">
        <div className="topbar">
          <span>Operasyon paneli</span>
          <span className="badge">
            Tek işletme · {user.role === "ADMIN" ? "Yönetici" : "Operatör"}
          </span>
        </div>
        <ErrorBox message={error} />
        {page === "dashboard" && <Dashboard user={user} onOpen={open} />}{" "}
        {page === "planning" && user.role==='ADMIN' && <Planning onOpen={open}/>}
        {page === "customers" && <Customers />}
        {page === "fields" && <Fields />}
        {page === "weather" && user.role === "ADMIN" && <Weather />}
        {page === "parcels" && user.role==='ADMIN' && <Parcels/>}
        {page === "drones" && <Drones />}
        {(page === "orders" || page === "calendar") && (
          <Orders user={user} calendar={page === "calendar"} onOpen={open} />
        )}{" "}
        {page === "detail" && selected && (
          <WorkDetail id={selected} user={user} onBack={() => P("orders")} />
        )}{" "}
        {page === "reports" && <Reports />}
        {page === "research" && <Research />}
        <footer>
          SAHA · Günlük işler ve müşteri takibi
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
