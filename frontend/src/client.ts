"use client";

import { createThirdwebClient } from "thirdweb";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "259c624014e3ea5ba93dccb08de55d83";

export const client = createThirdwebClient({
  clientId,
});
