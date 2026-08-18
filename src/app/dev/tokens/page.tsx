"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const COLOR_TOKENS = [
  { name: "surface", label: "Surface" },
  { name: "surface-raised", label: "Surface raised" },
  { name: "text", label: "Text" },
  { name: "text-muted", label: "Text muted" },
  { name: "accent", label: "Accent" },
  { name: "accent-contrast", label: "Accent contrast" },
  { name: "border", label: "Border" },
] as const;

const TYPE_SCALE = [
  { name: "2xs", className: "text-2xs" },
  { name: "sm", className: "text-sm" },
  { name: "body (default)", className: "text-body" },
  { name: "lg", className: "text-lg" },
  { name: "xl", className: "text-xl" },
  { name: "2xl", className: "text-2xl" },
  { name: "3xl", className: "text-3xl" },
] as const;

/** Fires the callback whenever the root element's class list changes (e.g. dark-mode toggle). */
function subscribeToRootClassChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/** Reads a CSS custom property live off the document root, re-reading whenever its class changes. */
function useCssVar(name: string): string {
  return useSyncExternalStore(
    subscribeToRootClassChange,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => "", // no DOM on the server
  );
}

function ColorSwatch({ token }: { token: (typeof COLOR_TOKENS)[number] }) {
  const value = useCssVar(`--${token.name}`);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div
        className="h-16 w-full rounded-md border border-border"
        style={{ background: `var(--${token.name})` }}
      />
      <div>
        <div className="text-sm font-medium text-text">{token.label}</div>
        <div className="text-2xs text-text-muted">
          --{token.name} · {value || "…"}
        </div>
      </div>
    </div>
  );
}

function FontSpecimen() {
  const heading = useCssVar("--font-heading");
  const body = useCssVar("--font-body");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-heading text-2xl text-text">Lexend — heading font</p>
        <p className="text-2xs text-text-muted">--font-heading · {heading || "…"}</p>
      </div>
      <div>
        <p className="font-sans text-body text-text">
          Source Sans 3 — body font. The quick brown fox jumps over the lazy dog.
        </p>
        <p className="text-2xs text-text-muted">--font-body · {body || "…"}</p>
      </div>
    </div>
  );
}

export default function DevTokensPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text">Design tokens</h1>
          <p className="text-body text-text-muted">
            LP-02 — every semantic token, live from CSS, plus the shadcn primitives that
            consume them. If a value here looks wrong, it&apos;s a regression.
          </p>
        </div>
        <Button variant="outline" onClick={() => setDark((d) => !d)}>
          {dark ? "Switch to light" : "Switch to dark"}
        </Button>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl text-text">Color tokens</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <ColorSwatch key={token.name} token={token} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl text-text">Fonts</h2>
        <FontSpecimen />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl text-text">Type scale</h2>
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((step) => (
            <div key={step.name} className="flex items-baseline gap-4">
              <span className="w-32 shrink-0 text-2xs text-text-muted">{step.name}</span>
              <span className={`${step.className} text-text`}>The quick brown fox</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl text-text">Components</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <Input placeholder="Input placeholder" className="max-w-sm" />

        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description using text-muted.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body text-text">Card body content.</p>
          </CardContent>
        </Card>

        <Dialog>
          <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>
                Confirms Dialog renders on semantic tokens, not raw colors.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="one" className="max-w-sm">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">
            <p className="text-body text-text">Tab one content.</p>
          </TabsContent>
          <TabsContent value="two">
            <p className="text-body text-text">Tab two content.</p>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
