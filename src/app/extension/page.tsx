import type { Metadata } from "next";
import { Code, InfoPage, StepItem, Steps } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Chrome extension — Cucina Loca",
  description: "Cook the recipe you're looking at in Chrome's side panel.",
};

export default function ExtensionPage() {
  return (
    <InfoPage
      eyebrow="Chrome on your computer"
      title="Cook right next to the recipe"
      intro="The Cucina Loca extension opens the cook view and assistant in Chrome's side panel, next to the recipe you're reading. It works on sites that don't let other services read their pages, because it reads the page from your own browser."
    >
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">How it works</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Click the Cucina Loca icon on any recipe. The side panel opens with the recipe ready to cook.</li>
          <li>It can only read a page when you click the icon on it (Chrome&apos;s “activeTab” permission). It never runs on sites in the background.</li>
          <li>Like the website, nothing is saved: close the panel and the session is gone.</li>
        </ul>
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Install</h2>
        <p className="text-muted">The Chrome Web Store listing is on its way. Until then, you can load it from the source code:</p>
        <Steps>
          <StepItem title="Download the source">
            <p>
              Get the <a className="text-accent underline underline-offset-4" href="https://github.com/juanpsav/cucinaloca">code on GitHub</a> and unzip it.
            </p>
          </StepItem>
          <StepItem title="Open Chrome's extensions page">
            <p>
              Go to <Code>chrome://extensions</Code> and turn on <strong className="text-ink">Developer mode</strong> (top right).
            </p>
          </StepItem>
          <StepItem title="Load it">
            <p>
              Click <strong className="text-ink">Load unpacked</strong> and choose the <Code>extension</Code> folder. Pin the icon from the puzzle-piece menu.
            </p>
          </StepItem>
        </Steps>
      </section>
    </InfoPage>
  );
}
