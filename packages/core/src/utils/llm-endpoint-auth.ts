export function isApiKeyOptionalForEndpoint(params: {
  readonly provider?: string | undefined;
  readonly baseUrl?: string | undefined;
}): boolean {
  if (params.provider === "anthropic") {
    return false;
  }
  if (!params.baseUrl) {
    return false;
  }

  try {
    const url = new URL(params.baseUrl);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname === "0.0.0.0"
      || hostname === "host.docker.internal"
      || hostname.endsWith(".local")
      || isPrivateIpv4(hostname)
    );
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((segment) => Number.parseInt(segment, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}
