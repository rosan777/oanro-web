import Script from "next/script";

// Google Analytics 4. Loads only when NEXT_PUBLIC_GA_ID (e.g. G-XXXXXXXXXX) is set, so nothing runs until you add it.
// Not rendered anywhere at the moment: the privacy center (privacy-center.tsx) loads Google Analytics after consent.
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
      >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}</Script>
    </>
  );
}
