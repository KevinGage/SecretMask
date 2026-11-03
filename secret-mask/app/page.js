"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "secret-mask.saved-secrets";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEntry(key = "", value = "") {
  return {
    id: createId(),
    key,
    value,
  };
}

function sanitizeKey(key, index) {
  const normalized = key
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || `SECRET_${index + 1}`;
}

function normalizeSecretEntries(entries) {
  const seen = new Map();

  return entries.map((entry, index) => {
    const rawKey = String(entry.key ?? "").trim();
    const baseKey = sanitizeKey(rawKey || `SECRET_${index + 1}`, index);
    const previousSeen = seen.get(baseKey) ?? 0;
    const uniqueKey =
      previousSeen === 0 ? baseKey : `${baseKey}_${previousSeen + 1}`;
    seen.set(baseKey, previousSeen + 1);

    return {
      id: entry.id || createId(),
      key: uniqueKey,
      value: String(entry.value ?? "").trim(),
    };
  });
}

function buildPlaceholder(key) {
  return `[${key}]`;
}

function maskText(text, secrets) {
  if (!text) {
    return "";
  }

  let maskedText = text;
  const activeSecrets = normalizeSecretEntries(secrets)
    .filter((entry) => entry.value)
    .sort((left, right) => right.value.length - left.value.length);

  for (const secret of activeSecrets) {
    const escaped = secret.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    maskedText = maskedText.replace(
      new RegExp(escaped, "g"),
      buildPlaceholder(secret.key),
    );
  }

  return maskedText;
}

function unmaskText(text, secrets) {
  if (!text) {
    return "";
  }

  let unmaskedText = text;
  const activeSecrets = normalizeSecretEntries(secrets).filter(
    (entry) => entry.value,
  );

  for (const secret of activeSecrets) {
    unmaskedText = unmaskedText.replaceAll(
      buildPlaceholder(secret.key),
      secret.value,
    );
  }

  return unmaskedText;
}

function readStoredSecrets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedSecrets = window.localStorage.getItem(STORAGE_KEY);

    if (!savedSecrets) {
      return [];
    }

    const parsedSecrets = JSON.parse(savedSecrets);

    if (!Array.isArray(parsedSecrets)) {
      return [];
    }

    return normalizeSecretEntries(parsedSecrets);
  } catch {
    return [];
  }
}

function getDefaultDemoText() {
  return "My password is T3stP@ssw0rd! and my API key is sk_live_9876543210. Reach me at jane.doe@example.com.";
}

export default function Home() {
  const [secretEntries, setSecretEntries] = useState([]);
  const [unredactedText, setUnredactedText] = useState("");
  const [redactedText, setRedactedText] = useState("");
  const [lastEdited, setLastEdited] = useState("unredacted");
  const [saveStatus, setSaveStatus] = useState("Ready");
  const [isSecretMapCollapsed, setIsSecretMapCollapsed] = useState(false);

  useEffect(() => {
    const storedSecrets = readStoredSecrets();

    if (storedSecrets.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const demoText = getDefaultDemoText();
      setSecretEntries(storedSecrets);
      setLastEdited("unredacted");
      setUnredactedText(demoText);
      setRedactedText(maskText(demoText, storedSecrets));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const persistSecrets = (entries) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setSaveStatus("Saved locally");
      window.setTimeout(() => setSaveStatus("Ready"), 1200);
    } catch {
      setSaveStatus("Could not save");
    }
  };

  const loadSampleSecrets = () => {
    const sampleSecrets = normalizeSecretEntries([
      createEntry("API_KEY", "sk_live_9876543210"),
      createEntry("PASSWORD", "T3stP@ssw0rd!"),
      createEntry("EMAIL", "jane.doe@example.com"),
    ]);
    const sampleText =
      "Use my API_KEY sk_live_9876543210 to authenticate, and my password is T3stP@ssw0rd! for admin access. Contact jane.doe@example.com for support.";

    setSecretEntries(sampleSecrets);
    setLastEdited("unredacted");
    setUnredactedText(sampleText);
    setRedactedText(maskText(sampleText, sampleSecrets));
    persistSecrets(sampleSecrets);
  };

  const updateSecret = (id, field, value) => {
    const updatedEntries = secretEntries.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry,
    );

    const normalizedEntries = normalizeSecretEntries(updatedEntries);
    const effectiveUnredacted =
      lastEdited === "redacted"
        ? unmaskText(redactedText, normalizedEntries)
        : unredactedText;

    setSecretEntries(normalizedEntries);
    setLastEdited("unredacted");
    setUnredactedText(effectiveUnredacted);
    setRedactedText(maskText(effectiveUnredacted, normalizedEntries));
    persistSecrets(normalizedEntries);
  };

  const addSecret = () => {
    const nextEntries = normalizeSecretEntries([
      ...secretEntries,
      createEntry(),
    ]);
    const effectiveUnredacted =
      lastEdited === "redacted"
        ? unmaskText(redactedText, nextEntries)
        : unredactedText;

    setSecretEntries(nextEntries);
    setLastEdited("unredacted");
    setUnredactedText(effectiveUnredacted);
    setRedactedText(maskText(effectiveUnredacted, nextEntries));
    persistSecrets(nextEntries);
  };

  const removeSecret = (id) => {
    const nextEntries = normalizeSecretEntries(
      secretEntries.filter((entry) => entry.id !== id),
    );
    const effectiveUnredacted =
      lastEdited === "redacted"
        ? unmaskText(redactedText, nextEntries)
        : unredactedText;

    setSecretEntries(nextEntries);
    setLastEdited("unredacted");
    setUnredactedText(effectiveUnredacted);
    setRedactedText(maskText(effectiveUnredacted, nextEntries));
    persistSecrets(nextEntries);
  };

  const clearAllSecrets = () => {
    setSecretEntries([]);
    setLastEdited("unredacted");
    setUnredactedText("");
    setRedactedText("");
    persistSecrets([]);
  };

  const handleUnredactedChange = (value) => {
    setLastEdited("unredacted");
    setUnredactedText(value);
    setRedactedText(maskText(value, secretEntries));
  };

  const handleRedactedChange = (value) => {
    setLastEdited("redacted");
    setRedactedText(value);
    setUnredactedText(unmaskText(value, secretEntries));
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              SecretMask
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Mask and unmask secrets in plain text
            </h1>
          </div>
          <button
            type="button"
            onClick={loadSampleSecrets}
            className="rounded-full border border-cyan-400/70 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/20"
          >
            Load sample data
          </button>
        </header>

        <div
          className={`grid gap-6 ${
            isSecretMapCollapsed
              ? "lg:grid-cols-1"
              : "lg:grid-cols-[420px_minmax(0,1fr)]"
          }`}
        >
          {!isSecretMapCollapsed && (
            <aside className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsSecretMapCollapsed(true)}
                  className="flex items-center gap-2 text-left text-lg font-semibold text-white"
                >
                  <span aria-hidden="true" className="text-cyan-300">
                    ▾
                  </span>
                  Secret map
                </button>
                <button
                  type="button"
                  onClick={addSecret}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  + Add secret
                </button>
              </div>

              <div className="space-y-3">
                {secretEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                    No secrets saved yet. Add a key/value pair to begin masking
                    text.
                  </div>
                ) : (
                  secretEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-700 bg-slate-950/70 p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input
                          aria-label="Secret value"
                          type="text"
                          value={entry.value}
                          onChange={(event) =>
                            updateSecret(entry.id, "value", event.target.value)
                          }
                          placeholder="Value"
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                        />
                        <input
                          aria-label="Secret key"
                          value={entry.key}
                          onChange={(event) =>
                            updateSecret(entry.id, "key", event.target.value)
                          }
                          placeholder="Key"
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeSecret(entry.id)}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
                          aria-label={`Remove ${entry.key || "secret"}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={clearAllSecrets}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Clear all
                </button>
                <span className="font-medium text-cyan-300">{saveStatus}</span>
              </div>
            </aside>
          )}

          <section className="space-y-6">
            {isSecretMapCollapsed && (
              <button
                type="button"
                onClick={() => setIsSecretMapCollapsed(false)}
                className="self-start rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400 hover:text-cyan-100"
              >
                ▸ Show secret map
              </button>
            )}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <label
                htmlFor="unredacted-text"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Unredacted input
              </label>
              <textarea
                id="unredacted-text"
                value={unredactedText}
                onChange={(event) => handleUnredactedChange(event.target.value)}
                placeholder="Paste or type the original text containing secrets..."
                className="min-h-[220px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <label
                htmlFor="redacted-text"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Redacted output
              </label>
              <textarea
                id="redacted-text"
                value={redactedText}
                onChange={(event) => handleRedactedChange(event.target.value)}
                placeholder="Paste a redacted version here to restore the original text..."
                className="min-h-[220px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
