"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { AddressForm } from "@/components/address-form";
import { HolderDigest } from "@/components/holder-digest";

function HoldingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("address") ?? "";
  const [address, setAddress] = useState<string>(initial);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="max-w-xl font-stencil text-3xl tracking-stencil text-bone sm:text-4xl">
        What happened to this address&apos;s holdings
      </h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-bone-muted">
        Paste any address. AFTERHOURS reads its tokenised-equity balances and every posted registry
        event for those tokens, directly from X Layer testnet — no wallet connection, no signature, no
        gas.
      </p>

      <div className="mt-8">
        <AddressForm
          initialValue={initial}
          onSubmit={(value) => {
            setAddress(value);
            router.replace(`/holdings?address=${value}`, { scroll: false });
          }}
        />
      </div>

      {address && isAddress(address) && <HolderDigest key={address} address={address as `0x${string}`} />}
    </div>
  );
}

export default function HoldingsPage() {
  return (
    <Suspense fallback={null}>
      <HoldingsInner />
    </Suspense>
  );
}
