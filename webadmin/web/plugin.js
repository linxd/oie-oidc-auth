// web/plugin.jsx
import { platform } from "@oie/web-shell";
var React = platform.React;
var api = platform.api;
var { toast, taskButton } = platform.ui;
var EXT = "/extensions/oidcauth";
var nextRowId = 0;
var CHOICE_LABELS = { "jit.enabled": { true: "662f", false: "否" }, "roles.infer": { false: "\u5426\u2014\u4ec5\u6620\u5c04\u58f0\u660e", true: "\u662f\u2014\u58f0\u660e\u503c\u5339\u914d\u89d2\u8272\u540d" }, "roles.sync": { always: "6bcf6b21767b5f55", "jit-only": "4ec5 JIT", never: "4ece4e0d" } };
var choiceLabel = (key, value) => CHOICE_LABELS[key] && CHOICE_LABELS[key][value] || value;
var truthy = (value) => ["true", "yes", "on", "1"].includes(String(value == null ? "" : value).trim().toLowerCase());
var parsePairs = (value) => String(value || "").split(",").map((s) => s.trim()).filter(Boolean).map((item) => {
  const i = item.indexOf("=");
  return { id: ++nextRowId, ...i > 0 ? { k: item.slice(0, i).trim(), v: item.slice(i + 1).trim() } : { k: item.trim(), v: "" } };
});
var serializePairs = (rows, isBlank = (v) => !String(v || "").trim()) => rows.filter((r) => r.k.trim() && !isBlank(r.v)).map((r) => `${r.k.trim()}=${r.v.trim()}`).join(",");
var pairProblem = (rows, isBlank = (v) => !String(v || "").trim()) => {
  if (rows.some((r) => !!r.k.trim() !== !isBlank(r.v))) return "6bcf4e00884c90fd97008981540c65f651776709952e548c503c \u2014 586b51997a7a767d9879Ff0c6216522096648be5884c3002";
  const keys = rows.map((r) => r.k.trim()).filter(Boolean);
  const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);
  return duplicate ? `"${duplicate}" 51fa73b0591a6b21 \u2014 53ea67096700540e4e004e2a4f1a751f65483002` : null;
};
function ChoiceSelect({ value, options, placeholder, unknownLabel, disabled, onChange, style }) {
  const current = String(value || "");
  return /* @__PURE__ */ React.createElement("select", { style, value: current, disabled, onChange: (e) => onChange(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, placeholder || "\u2014 \u9009\u62e9 \u2014"), options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o)), current && !options.includes(current) ? /* @__PURE__ */ React.createElement("option", { value: current }, current, " ", unknownLabel || "(672a77e5)") : null);
}
var listOf = (raw, key) => {
  const inner = raw && typeof raw === "object" && !Array.isArray(raw) && raw.list ? raw.list : raw;
  const items = inner && typeof inner === "object" && !Array.isArray(inner) && inner[key] !== void 0 ? inner[key] : inner;
  return Array.isArray(items) ? items : items && typeof items === "object" ? [items] : [];
};
var roleNamesOf = (raw) => listOf(raw, "com.diridium.rbac.Role").map((r) => r && r.name).filter(Boolean);
var userNamesOf = (raw) => listOf(raw, "user").map((u) => u && u.username).filter(Boolean);
var SUGGESTIONS = (form) => ({
  "username-claim": ["preferred_username", "email", "upn", "unique_name", "cognito:username", "sub"],
  "jit.email-claim": ["email", "upn", "mail"],
  "jit.name-claim": ["name", "given_name", "family_name", "display_name"],
  "jit.organization-claim": ["organization", "org", "company"],
  "roles.claim": ["groups", "roles", "cognito:groups", "realm_access.roles", `resource_access.${String(form["client-id"] || "").trim() || "<client-id>"}.roles`]
});
function PairEditor({ label, value, onChange, onProblem, disabled, keyPlaceholder, keyOptions, keyUnknownLabel, valuePlaceholder, valueOptions, valueUnknownLabel, valuePrefix, valueCheck, addLabel }) {
  const [rows, setRows] = React.useState(() => parsePairs(value));
  const last = React.useRef(value);
  React.useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setRows(parsePairs(value));
    }
  }, [value]);
  const isBlank = (v) => {
    const t = String(v || "").trim();
    return !t || !!valuePrefix && t === valuePrefix;
  };
  const problem = disabled ? null : rows.filter((r) => r.k.trim()).map((r) => valueCheck ? valueCheck(r.v) : null).find(Boolean) || pairProblem(rows, isBlank);
  React.useEffect(() => {
    onProblem(problem);
    return () => onProblem(null);
  }, [problem, onProblem]);
  const commit = (next) => {
    setRows(next);
    const s = serializePairs(next, isBlank);
    if (s !== last.current) {
      last.current = s;
      onChange(s);
    }
  };
  const edit = (id, part, text) => commit(rows.map((r) => r.id === id ? { ...r, [part]: part === "k" ? text.replace(/[,=]/g, "") : text.replace(/,/g, "") } : r));
  return /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, label), rows.map((row) => /* @__PURE__ */ React.createElement("div", { key: row.id, style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 } }, Array.isArray(keyOptions) ? /* @__PURE__ */ React.createElement(ChoiceSelect, { style: { flex: 1 }, value: row.k, options: keyOptions, placeholder: keyPlaceholder, unknownLabel: keyUnknownLabel, disabled, onChange: (v) => edit(row.id, "k", v) }) : /* @__PURE__ */ React.createElement("input", { style: { flex: 1 }, type: "text", value: row.k, placeholder: keyPlaceholder, disabled, onChange: (e) => edit(row.id, "k", e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "text-text-faint" }, "\u2192"), Array.isArray(valueOptions) ? /* @__PURE__ */ React.createElement(ChoiceSelect, { style: { flex: 1 }, value: row.v, options: valueOptions, placeholder: valuePlaceholder, unknownLabel: valueUnknownLabel, disabled, onChange: (v) => edit(row.id, "v", v) }) : /* @__PURE__ */ React.createElement("input", { style: { flex: 1 }, type: "text", value: row.v, placeholder: valuePlaceholder, disabled, onChange: (e) => edit(row.id, "v", e.target.value) }), /* @__PURE__ */ React.createElement("button", { className: "btn", type: "button", disabled, title: "79fb9664", onClick: () => commit(rows.filter((r) => r.id !== row.id)) }, "\xD7"))), /* @__PURE__ */ React.createElement("button", { className: "btn", type: "button", disabled, onClick: () => {
    setRows([...rows, { id: ++nextRowId, k: "", v: valuePrefix || "" }]);
  } }, addLabel), problem ? /* @__PURE__ */ React.createElement("div", { style: { color: "var(--err)", fontSize: 12, marginTop: 4 } }, problem) : null);
}
var decode = (value) => {
  if (typeof value === "string") return value ? JSON.parse(value) : {};
  return value && typeof value === "object" ? typeof value.string === "string" ? JSON.parse(value.string) : value : {};
};
function OidcPanel({ setTasks, setSave, markDirty, markClean }) {
  const [form, setForm] = React.useState(null), [error, setError] = React.useState("");
  const formRef = React.useRef(null);
  formRef.current = form;
  const load = React.useCallback(async () => {
    try {
      setForm(decode(await api.get(`${EXT}/configuration`)));
      setError("");
      markClean();
    } catch (e) {
      setError(e.message || "52a08f7d OIDC 914d7f6e59318d253002");
    }
  }, [markClean]);
  const [pairProblems, setPairProblems] = React.useState({});
  const problemHandlers = React.useRef({});
  const noteProblem = React.useCallback((which) => {
    if (!problemHandlers.current[which]) problemHandlers.current[which] = (problem) => setPairProblems((p) => p[which] === problem ? p : { ...p, [which]: problem });
    return problemHandlers.current[which];
  }, []);
  const problemsRef = React.useRef(pairProblems);
  problemsRef.current = pairProblems;
  const save = React.useCallback(async () => {
    const blocking = Object.values(problemsRef.current).filter(Boolean);
    if (blocking.length) {
      toast(blocking[0], "error");
      return false;
    }
    try {
      await api.put(`${EXT}/configuration`, { string: JSON.stringify(form) });
    } catch (e) {
      toast(e.message || "OIDC 914d7f6e65e06cd54fdd5b583002", "error");
      return false;
    }
    markClean();
    try {
      setForm(decode(await api.get(`${EXT}/configuration`)));
      toast("OIDC 914d7f6e5df24fdd5b583002", "success");
    } catch (e) {
      toast(`OIDC configuration saved, but the tab could not re-read it: ${e.message || "刷新以确认"}`, "warn");
    }
    return true;
  }, [form, markClean]);
  const saveRef = React.useRef(save);
  saveRef.current = save;
  const [roleNames, setRoleNames] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const names = roleNamesOf(await api.get("/extensions/rbac/roles"));
        if (alive && names.length) setRoleNames(names);
      } catch (e) {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const [userNames, setUserNames] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const names = userNamesOf(await api.get("/users"));
        if (alive && names.length) setUserNames(names);
      } catch (e) {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  React.useEffect(() => {
    load();
  }, []);
  React.useEffect(() => {
    setTasks("OIDC 8ba48bc14efb52a1", [
      taskButton("4fdd5b58", "save", () => saveRef.current(), { primary: true, task: "doSave", group: "settings_OIDC 认证" }),
      taskButton("523765b0", "refresh", load),
      // A pure check: reports, and changes nothing in the form or the engine.
      taskButton("6d4b8bd58fde63a5", "check", async () => {
        try {
          const r = decode(await api.post(`${EXT}/test`, { string: JSON.stringify(formRef.current) }));
          toast(`OIDC verified: ${r.issuer || "issuer"} \u2014 ${r.keyCount || 0} 4e2a7b7e540d5bc694a553ef8bbf95ee`, "success");
        } catch (e) {
          toast(e.message || "OIDC 8fde63a56d4b8bd559318d253002", "error");
        }
      })
    ]);
  }, [load, setTasks]);
  React.useEffect(() => {
    setSave(save);
  }, [save, setSave]);
  const patch = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    markDirty();
  };
  if (error) return /* @__PURE__ */ React.createElement("div", { className: "p-4", style: { color: "var(--err)" } }, error);
  if (!form) return /* @__PURE__ */ React.createElement("div", { className: "p-4 text-text-faint" }, "\u52a0\u8f7d\u4e2d\u2026");
  const pinned = Array.isArray(form._pinned) ? form._pinned : [];
  const schema = Array.isArray(form._schema) ? form._schema : [];
  const locked = (key) => key !== "enabled" && !truthy(form.enabled) || pinned.includes(key);
  const pinnedNote = (key) => pinned.includes(key) ? /* @__PURE__ */ React.createElement("span", { className: "text-text-faint", style: { fontWeight: "normal" } }, " \u2014 pinned") : null;
  return /* @__PURE__ */ React.createElement("div", { className: "p-4", style: { maxWidth: 820 } }, String(form._killSwitch) === "true" ? /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-2", style: { border: "1px solid var(--err)", borderRadius: 6, color: "var(--err)" } }, /* @__PURE__ */ React.createElement("strong", null, "SSO 已被紧急开关关闭。"),  引擎拒绝所有 OIDC 登录，不再向登录界面提供 SSO，无视此表单设置。清除 , /* @__PURE__ */ React.createElement("code", null, "OIE_OIDC_DISABLED"),  (或 , /* @__PURE__ */ React.createElement("code", null, "org.openintegrationengine.oidc.disabled"),  系统属性)并重启以重新启用。") : null, form._error ? /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-2", style: { border: "1px solid var(--err)", borderRadius: 6, color: "var(--err)" } }, /* @__PURE__ */ React.createElement("strong", null, "此策略未生效。"),  引擎在加载时拒绝了它: , form._error,  在它解析成功之前，登录界面不提供 SSO 按钮，登录尝试会得知 SSO 已禁用。") : null, pinned.length ? /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-2", style: { border: "1px solid var(--line)", borderRadius: 6 } }, "\u7531\u8fd0\u7ef4\u73af\u5883\u56fa\u5b9a\u2014 ", /* @__PURE__ */ React.createElement("code", null, "OIE_OIDC_*"),  变量或系统属性覆盖了这些设置，因此以只读方式显示，保存不会更改存储的策略: , /* @__PURE__ */ React.createElement("strong", null, pinned.join(", "))) : null, /* @__PURE__ */ React.createElement("div", { className: "mb-4 text-text-faint", style: { fontSize: 12 } }, 要在提供商处注册的重定向 URI: , /* @__PURE__ */ React.createElement("code", null, form._redirectUri || "<web-administrator-origin>/oidc/callback")), schema.filter((f) => f.key === "enabled").map((f) => /* @__PURE__ */ React.createElement("div", { className: "mb-4", key: f.key }, /* @__PURE__ */ React.createElement("label", { className: "check" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: truthy(form.enabled),
      disabled: locked(f.key),
      onChange: (e) => patch("enabled", String(e.target.checked))
    }
  ), f.label, pinnedNote(f.key)))), (() => {
    const suggest = SUGGESTIONS(form);
    const renderField = (f) => /* @__PURE__ */ React.createElement("div", { className: "field", key: f.key }, /* @__PURE__ */ React.createElement("label", null, f.label, pinnedNote(f.key)), f.kind === "boolean" || f.kind === "enum" ? /* @__PURE__ */ React.createElement("select", { value: form[f.key] || "", disabled: locked(f.key), onChange: (e) => patch(f.key, e.target.value) }, (f.kind === "boolean" ? ["true", "false"] : f.choices || []).map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, choiceLabel(f.key, c)))) : f.key === "roles.default" && roleNames ? /* @__PURE__ */ React.createElement(ChoiceSelect, { value: form[f.key] || "", options: roleNames, placeholder: "\u2014 \u65e0\u9ed8\u8ba4\u89d2\u8272 \u2014", unknownLabel: "(非现有角色)", disabled: locked(f.key), onChange: (v) => patch(f.key, v) }) : f.kind === "secret" ? /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        autoComplete: "new-password",
        value: form[f.key] || "",
        placeholder: "未设置",
        disabled: locked(f.key),
        onChange: (e) => patch(f.key, e.target.value)
      }
    ) : /* @__PURE__ */ React.createElement(
      "input",
      {
        type: f.kind === "number" ? "number" : f.kind === "url" ? "url" : "text",
        value: form[f.key] || "",
        list: suggest[f.key] ? `oidc-suggest-${f.key}` : void 0,
        disabled: locked(f.key),
        onChange: (e) => patch(f.key, e.target.value)
      }
    ), suggest[f.key] ? /* @__PURE__ */ React.createElement("datalist", { id: `oidc-suggest-${f.key}` }, suggest[f.key].map((s) => /* @__PURE__ */ React.createElement("option", { key: s, value: s }))) : null);
    const issuerKnown = String(form._issuer || "").trim();
    const subjectCheck = (v) => /#\s*$/.test(String(v || "")) ? `\u5728 "#" \u540e\u7c98\u8d34\u4e3b\u4f53 \u2014 \u60a8\u7684\u63d0\u4f9b\u5546\u4e3a\u8be5\u7528\u6237\u663e\u793a\u7684\u6807\u8bc6\u7b26 (\u5728 Keycloak \u4e2d\u4e3a\u7528\u6237 ID)\u3002` : null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, schema.filter((f) => f.key !== "enabled" && f.kind !== "pairs").map(renderField)), /* @__PURE__ */ React.createElement("div", { className: "mt-4", style: { maxWidth: 560 } }, schema.filter((f) => f.kind === "pairs").map((f) => /* @__PURE__ */ React.createElement(
      PairEditor,
      {
        key: f.key,
        label: f.label + (pinned.includes(f.key) ? " \u2014 pinned" : ""),
        value: form[f.key] || "",
        disabled: locked(f.key),
        addLabel: f.key === "roles.map" ? "添加映射" : "关联账户",
        keyPlaceholder: f.key === "roles.map" ? "声明值 (例如 oie-admins)" : userNames ? "\u2014 choose a user \u2014" : "引擎用户名",
        keyOptions: f.key === "linked-accounts" ? userNames : void 0,
        keyUnknownLabel: "(无此用户)",
        valuePlaceholder: f.key === "roles.map" ? roleNames ? "\u2014 choose a role \u2014" : "RBAC 角色 (例如 Administrator)" : "issuer#subject",
        valueOptions: f.key === "roles.map" ? roleNames : void 0,
        valueUnknownLabel: "(非现有角色)",
        valuePrefix: f.key === "linked-accounts" && issuerKnown ? `${issuerKnown}#` : "",
        valueCheck: f.key === "linked-accounts" ? subjectCheck : void 0,
        onChange: (v) => patch(f.key, v),
        onProblem: noteProblem(f.key)
      }
    ))));
  })());
}
async function register(host) {
  try {
    await api.get(`${EXT}/configuration`);
  } catch (e) {
    if (e && e.status === 403) {
      console.warn("[oidcauth] manageOIDC \u672a\u6388\u4e88 \u2014 \u9690\u85cf\u8bbe\u7f6e\u9762\u677f");
      return;
    }
    console.warn("[oidcauth] \u6743\u9650\u63a2\u6d4b\u4e0d\u786e\u5b9a \u2014 \u663e\u793a\u8bbe\u7f6e\u9762\u677f:", e);
  }
  host.registerSettingsPanel({ label: "OIDC 认证", order: 80, component: OidcPanel });
}
export {
  register
};
